function ConfigProjectOwner({onClose, appconfig, onSubmit, searchJiraUsers, jiraUserLists }){
    const [project, setProject] = useState("");
    const [owner, setOwner] = useState("");
    const [label, setLabel] = useState("")
    const [jiraProject, setJiraProject] = useState("")
    const [fieldObj,setFieldObj] = useState({})
    let [errors, setErrors] = useState({})

    const { allsys, projects, jiraAllProjects, jiraAllProjKeys } = useMemo(() => {
        const _appcnf = (appconfig || {});
        let _allsys = _appcnf.systems || [];
        _allsys = _allsys.map((sys) => ({
            id: sys, value: sys
        }));
        const _projects = _appcnf.projects || {};
        let _jiraAllProjects = _appcnf.jiraProjects || [];
        _jiraAllProjects = _jiraAllProjects.map(({ key, name }) => ({
            id: key, value: name + " (" + key + ")"
        }));
        let _jiraAllProjKeys = _jiraAllProjects.map((proj) => proj.id);
        return { allsys: _allsys, projects: _projects, jiraAllProjects: _jiraAllProjects, jiraAllProjKeys: _jiraAllProjKeys };
    }, [appconfig]);

    const onChange = (e, name, label, value) => {
        if(name == 'project') {
            let { jiraProject = "", owner = "", labels = [], fields = {} } = ((appconfig['jira'] && appconfig['jira'][value]) || {});
            labels = Array.isArray(labels) ? labels.join(",") : labels;
            setErrors(errors = {});
            setProject(value);
            setJiraProject(jiraProject);
            setOwner(owner)
            setLabel(labels)
            setFieldObj(deSerializeJson(fields));
            if(owner) {
                onUserSearch(owner);
            }
        } else if(name == 'owner') {
            setOwner(value);
        } else if(name == 'label') {
            setLabel(value)
        } else if(name == 'jiraProject') {
            setJiraProject(value)
            setFieldObj({});
        }
        fieldValidation(e, value, name, label);
    }

    const onReqFieldChange = (ev, name, label, value) => {
        setFieldObj({ ...fieldObj, [name]: value });
        fieldValidation(ev, value, name, label);
    }

    const onJsonFieldChange = (field, value, name) => {
        setFieldObj({ ...fieldObj, [name]: value });
        fieldValidation(null, (value || {})[field.fieldId], name + "_" + field.fieldId, field.name);
    }

    const fieldValidation = (ev, value, fieldKey, fieldName) => {
        if(value) {
            delete errors[fieldKey];
            setErrors({ ...errors });
        }
        else {
            setErrors({ ...errors, [fieldKey]: `${fieldName} must have valid entry.` });
        }
    }

    function onUserSearch(searchText, isValid) {
        searchText = searchText.trim();
        searchJiraUsers({ search: searchText });
    }

    function renderOption(item) {
        return <>
            <img className="mr-2" width="24" height="24" src={item.thumbUrl} />
            <div className="w-100">
                <span>{item.displayName + " (" + item["vzid"] + ')'}</span>
                <br />
                <small>{item.email}</small>
            </div>
        </>;
    }

    const isNotEmpty = function (value) {
        return value && value.trim() !== ''
    }

    const serializeJson = (pval) => {
        if(isJson(pval)) {
            return JSON.stringify(pval);
        }
        return pval;
    }

    const deSerializeJson = (pval) => {
        for(var ikey in pval) {
            try {
                const jsonVal = JSON.parse(pval[ikey]);
                pval[ikey] = jsonVal;
            }
            catch(ex) {}
        }
        return pval;
    }

    const isJson = function(val) {
        if(val != null && !Array.isArray(val) && typeof val == "object") {
            return true;
        }
        return false;
    }
    
    const onValidate = (e) => {
        let errLists = {};
        let jira = (appconfig || {}).jira || {}
        let payload = {};

        let formValid = true;
        if(isNotEmpty(project) && appconfig['projects'] && appconfig['projects'].indexOf(project) != -1) {
            payload["project"] = project;
        }
        else {
            formValid = false;
            errLists["project"] = 'Project must have valid entry.';
        }
        if(isNotEmpty(jiraProject) && jiraAllProjKeys.indexOf(jiraProject) > -1) {
            payload["jiraProject"] = jiraProject;
        }
        else {
            formValid = false;
            errLists["jiraProject"] = 'Jira Project must have valid entry.';
        }
        if(isNotEmpty(owner)) {
            payload["owner"] = owner;
        }
        else {
            formValid = false;
            errLists["owner"] = 'Assignee must have valid entry.';
        }
        if(isNotEmpty(label)) {
            payload["labels"] = label.split(",");
        }
        let requiredField = getRequiredFields();
        if(requiredField?.length) {
            payload["fields"] = {};
        }
        requiredField.forEach((field) => {
            const fieldPnt = payload["fields"];
            if(field.addonFields) {
                fieldPnt[field.fieldId] = fieldPnt[field.fieldId] || {};
                for(var iKey in field.addonFields) {
                    const addOnItem = field.addonFields[iKey];
                    if(fieldObj[field.fieldId] && isNotEmpty(fieldObj[field.fieldId][addOnItem.fieldId])) {
                        fieldPnt[field.fieldId][addOnItem.fieldId] = fieldObj[field.fieldId][addOnItem.fieldId];
                    }
                    else {
                        errLists[field.fieldId + "_" + addOnItem.fieldId] = `${addOnItem.name} must have valid entry.`;
                        formValid = false;
                    }
                }
                fieldPnt[field.fieldId] = serializeJson(fieldPnt[field.fieldId]);
                return;
            }
            if(isNotEmpty(fieldObj[field.fieldId])) {
                fieldPnt[field.fieldId] = fieldObj[field.fieldId];
            }
            else {
                errLists[field.fieldId] = `${field.name} must have valid entry.`;
                formValid = false;
            }
        });
        setErrors(errLists);
        if(formValid) {
            const projValue = jira[project] = payload;
            onClose(e)
            onSubmit(
                {jiraDetails: projValue, project}
            )
        }
    }

    function getRequiredFields() {
        let selectedProj = appconfig?.jiraProjects?.filter((val)=>val.key == jiraProject)[0];
        let requiredField = selectedProj?.requiredFields || [];
        return requiredField;
    }

    let requiredField = getRequiredFields();
    return (
        <div>
            <form>
                <div className="row">
                    <div className="col">
                        <ComboBox className="vz-input-field" size="small" label={"Project **"} list={projects} onChange={(e,value) => {onChange(e, 'project', "Project", value)}} value={project} />
                        {errors["project"] && <div className={"col-12 col-md-12 is-invalid px-0"}>
                            <div className="invalid-feedback" style={{ display: 'block' }}>{errors["project"]}</div>
                        </div>}
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col">
                        <label className="mb-0">Jira Projects **</label>
                        <DropDown className="vz-input-field w-100 mb-0 mt-0" size="small" label={"Jira Projects **"} list={[{ id: "", value: "Please Select" }, ...jiraAllProjects]} onChange={(e, value) => {onChange(e, 'jiraProject', "Jira Project", (e.target.value == "Please Select" ? "" : e.target.value))}} selectedItem={jiraProject} disabled={!isNotEmpty(project)} />
                        {errors["jiraProject"] && <div className={"col-12 col-md-12 is-invalid px-0"}>
                            <div className="invalid-feedback" style={{ display: 'block' }}>{errors["jiraProject"]}</div>
                        </div>}
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        {/* <div style={{margin: "24px 0 0 0"}}>
                            <input name="owner" className="form-control" pattern="[a-zA-Z0-9]+" placeholder={"Default assignee (VZID)"} onChange={(e,value) => {onChange(e, 'owner', "Assignee", e.target.value)}} value={owner}/>
                        </div> */}
                        <VzSuggestionList style={{margin: "14px 0 0 0"}} 
                            inputParams={{
                                name: "jirausers",
                                pattern: "[a-zA-Z0-9]+",
                                label: "Default assignee (VZID)",
                                placeholder: "Minimum 3 chars to search"
                            }}
                            suggLists={jiraUserLists}
                            renderOption={renderOption}
                            listKey="displayName"
                            noMsg={"No Users Found"}
                            value={owner}
                            onSearch={onUserSearch}
                            onChange={(event) => onChange(event, 'owner', "Assignee", event.target.value)}
                            onOptClick={(event, item) => onChange(event, 'owner', "Assignee", item.vzid)} disabled={!isNotEmpty(project)} />
                        {errors["owner"] && <div className={"col-12 col-md-12 is-invalid px-0"}>
                            <div className="invalid-feedback" style={{ display: 'block' }}>{errors["owner"]}</div>
                        </div>}
                    </div>
                </div>
                
                {/*<div className="row">
                    {/* <div className="col"><div style={{margin: "24px 0 0 0"}}><input className="form-control" placeholder={"SYSTEMS"} onChange={(e,value) => {onChange(e,value,'system')}} value={system}/></div></div> 
                    <div className="col"><DropDown className="vz-input-field w-100" size="small" label={"Systems"} list={[{ id: "", value: "All Systems" }, ...allsys]} onChange={(e,value) => {onChange(e,value,'system')}} selectedItem={system} /></div>
                </div>*/}
                {/* <div className="row">
                    <div className={error ? "col-12 col-md-12 is-invalid" : "col-12 col-md-12"}>
                        <div className="invalid-feedback" style={{ display: 'block' }}>{error}</div>
                    </div>
                </div> */}
                <div>
                {requiredField?.map((field, index)=>{
                    if(field?.addonFields) {
                        return (<JiraJsonField key={field.fieldId + "_" + index} errors={errors} fields={field.addonFields} value={fieldObj[field.fieldId]} parentKey={field.fieldId} onChange={onJsonFieldChange} />)
                    }
                    else if(field?.allowedValues){
                        return(
                            <div className="row">
                                <div className="col">
                                <div style={{margin: "24px 0 0 0"}}>
                            <TextField
                              select
                              fullWidth
                              name={field.fieldId}
                              variant="outlined"
                              className="vz-input-field"
                              label={`${field.name} *`}
                              placeholder={field.name}
                              defaultValue={fieldObj[field.fieldId] ||''}
                              onChange={(ev) => onReqFieldChange(ev, field.fieldId, field.name, ev.target.value)}
                              required
                            >
                                {[...field?.allowedValues].map((option) => {
                          return (<MenuItem key={option?.name || option?.value} value={option?.name || option?.value}>
                                 {option?.name || option?.value}
                                </MenuItem>)}
                                 )}
                            </TextField>
                        </div>
                        {errors[field.fieldId] && <div className={"col-12 col-md-12 is-invalid px-0"}>
                            <div className="invalid-feedback" style={{ display: 'block' }}>{errors[field.fieldId]}</div>
                        </div>}
                        </div>
                        </div>
                        )
                    }else{
                        return (
                        <div className="row">
                       <div className="col">
                        <div style={{margin: "24px 0 0 0"}}>
                            <TextField
                             id="outlined-basic"
                             className="vz-input-field"
                             fullWidth
                             label={`${field.name} *`}
                             name={field.fieldId}
                             placeholder={field.name}
                             defaultValue={fieldObj[field.fieldId] || ''}
                             variant="outlined"
                             onChange={(ev) => onReqFieldChange(ev, field.fieldId, field.name, ev.target.value)}
                            required
                            />
                        </div>
                        {errors[field.fieldId] && <div className={"col-12 col-md-12 is-invalid px-0"}>
                            <div className="invalid-feedback" style={{ display: 'block' }}>{errors[field.fieldId]}</div>
                        </div>}
                        </div>
                        </div>)
                    }
                })}
                </div>
                <div className="row">
                    <div className="col"><div style={{margin: "24px 0 0 0"}}><input className="form-control" placeholder={"LABELS"} onChange={(e,value) => {onChange(e, 'label', "Labels", e.target.value)}} value={label} disabled={!isNotEmpty(project)}/></div></div>
                </div>
                <div className="delete-confirm">
                    <div className="button-container">
                        <button className="button" type="button" name="submit" value="Submit" onClick={onValidate}>Submit</button>
                        <button className="button" type="button" name="ok" value="close" onClick={onClose}>Close</button>
                    </div>
                </div>
            </form>
        </div>
    )
}

function JiraJsonField({ fields = [], value, parentKey = "", onChange, errors }) {
    let [jsonValue, setJsonValue] = useState(parseValue(value));

    useEffect(() => {
        if(typeof value != "undefined" && jsonValue !== value) {
            setJsonValue(parseValue(value));
        }
    }, [value]);

    function parseValue(iVal) {
        if(value != null && !Array.isArray(value) && typeof value == "object") {
            return iVal;
        }
        else {
            return {};
        }
    }

    function handleChange(ev, targetValue, field) {
        jsonValue[field.fieldId] = targetValue;
        setJsonValue(jsonValue);
        onChange(field, jsonValue, parentKey);
    }

    return <>
    {fields.map((field, index) => {
        let type = field.allowedValues && field.allowedValues.length ? "combobox" : "text";
        let fieldTitle;
        if(field.allowedValues && field.allowedValues[0]) {
            if(field.allowedValues[0].name) {
                fieldTitle = "name";
            }
            else if(field.allowedValues[0].value) {
                fieldTitle = "value";
            }
        }
        return <div className="row">
            <div className="col" style={{margin: "14px 0 0 0"}}>
                <Field key={field.fieldId + "_" + index} type={type} id={field.id} name={field.fieldId} label={field.name} placeholder={field.name} list={field.allowedValues}
                title={fieldTitle} onChange={(ev) => {
                    handleChange(ev, ev.target.value, field)
                }} value={jsonValue[field.fieldId] || ""} />
                 {errors[parentKey +"_" + field.fieldId] && <div className={"col-12 col-md-12 is-invalid px-0"}>
                            <div className="invalid-feedback" style={{ display: 'block' }}>{errors[parentKey +"_" + field.fieldId]}</div>
                        </div>}
            </div>
        </div>
    })}
    </>;
}
