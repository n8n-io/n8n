import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export async function getToken() {
    const credentials = await this.getCredentials('fileMaker');
    const host = credentials.host;
    const db = credentials.db;
    const login = credentials.login;
    const password = credentials.password;
    const url = `https://${host}/fmi/data/v1/databases/${db}/sessions`;
    // Reset all values
    const requestOptions = {
        uri: url,
        headers: {},
        method: 'POST',
        json: true,
        //rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
    };
    requestOptions.auth = {
        user: login,
        pass: password,
    };
    requestOptions.body = {
        fmDataSource: [
            {
                database: host,
                username: login,
                password,
            },
        ],
    };
    try {
        const response = await this.helpers.request(requestOptions);
        if (typeof response === 'string') {
            throw new NodeOperationError(this.getNode(), 'DataAPI response body is not valid JSON. Is the DataAPI enabled?');
        }
        return response.response.token;
    }
    catch (error) {
        let message;
        if (error.statusCode === 502) {
            message = 'The server is not responding. Is the DataAPI enabled?';
        }
        else if (error.error) {
            message = error.error.messages[0].code + ' - ' + error.error.messages[0].message;
        }
        else {
            message = error.message;
        }
        throw new NodeOperationError(this.getNode(), message, { level: 'warning' });
    }
}
function parseLayouts(layouts) {
    const returnData = [];
    for (const layout of layouts) {
        if (layout.isFolder) {
            returnData.push(...parseLayouts(layout.folderLayoutNames));
        }
        else {
            returnData.push({
                name: layout.name,
                value: layout.name,
            });
        }
    }
    return returnData;
}
/**
 * Make an API request to ActiveCampaign
 *
 */
export async function layoutsApiRequest() {
    const token = await getToken.call(this);
    const credentials = await this.getCredentials('fileMaker');
    const host = credentials.host;
    const db = credentials.db;
    const url = `https://${host}/fmi/data/v1/databases/${db}/layouts`;
    const options = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method: 'GET',
        uri: url,
        json: true,
    };
    try {
        const responseData = await this.helpers.request(options);
        const items = parseLayouts(responseData.response.layouts);
        items.sort((a, b) => (a.name > b.name ? 0 : 1));
        return items;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getFields() {
    const token = await getToken.call(this);
    const credentials = await this.getCredentials('fileMaker');
    const layout = this.getCurrentNodeParameter('layout');
    const host = credentials.host;
    const db = credentials.db;
    const url = `https://${host}/fmi/data/v1/databases/${db}/layouts/${layout}`;
    const options = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method: 'GET',
        uri: url,
        json: true,
    };
    const responseData = await this.helpers.request(options);
    return responseData.response.fieldMetaData;
}
/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getPortals() {
    const token = await getToken.call(this);
    const credentials = await this.getCredentials('fileMaker');
    const layout = this.getCurrentNodeParameter('layout');
    const host = credentials.host;
    const db = credentials.db;
    const url = `https://${host}/fmi/data/v1/databases/${db}/layouts/${layout}`;
    const options = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method: 'GET',
        uri: url,
        json: true,
    };
    const responseData = await this.helpers.request(options);
    return responseData.response.portalMetaData;
}
function parseScriptsList(scripts) {
    const returnData = [];
    for (const script of scripts) {
        if (script.isFolder) {
            returnData.push(...parseScriptsList(script.folderScriptNames));
        }
        else if (script.name !== '-') {
            returnData.push({
                name: script.name,
                value: script.name,
            });
        }
    }
    return returnData;
}
/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getScripts() {
    const token = await getToken.call(this);
    const credentials = await this.getCredentials('fileMaker');
    const host = credentials.host;
    const db = credentials.db;
    const url = `https://${host}/fmi/data/v1/databases/${db}/scripts`;
    const options = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method: 'GET',
        uri: url,
        json: true,
    };
    const responseData = await this.helpers.request(options);
    const items = parseScriptsList(responseData.response.scripts);
    items.sort((a, b) => (a.name > b.name ? 0 : 1));
    return items;
}
export async function logout(token) {
    const credentials = await this.getCredentials('fileMaker');
    const host = credentials.host;
    const db = credentials.db;
    const url = `https://${host}/fmi/data/v1/databases/${db}/sessions/${token}`;
    // Reset all values
    const requestOptions = {
        uri: url,
        headers: {},
        method: 'DELETE',
        json: true,
        //rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
    };
    const response = await this.helpers.request(requestOptions);
    return response;
}
export function parseSort(i) {
    let sort;
    const setSort = this.getNodeParameter('setSort', i, false);
    if (!setSort) {
        sort = null;
    }
    else {
        sort = [];
        const sortParametersUi = this.getNodeParameter('sortParametersUi', i, {});
        if (sortParametersUi.rules !== undefined) {
            for (const parameterData of sortParametersUi.rules) {
                sort.push({
                    fieldName: parameterData.name,
                    sortOrder: parameterData.value,
                });
            }
        }
    }
    return sort;
}
export function parseScripts(i) {
    const setScriptAfter = this.getNodeParameter('setScriptAfter', i, false);
    const setScriptBefore = this.getNodeParameter('setScriptBefore', i, false);
    const setScriptSort = this.getNodeParameter('setScriptSort', i, false);
    if (!setScriptAfter && setScriptBefore && setScriptSort) {
        return {};
    }
    else {
        const scripts = {};
        if (setScriptAfter) {
            scripts.script = this.getNodeParameter('scriptAfter', i);
            scripts['script.param'] = this.getNodeParameter('scriptAfter', i);
        }
        if (setScriptBefore) {
            scripts['script.prerequest'] = this.getNodeParameter('scriptBefore', i);
            scripts['script.prerequest.param'] = this.getNodeParameter('scriptBeforeParam', i);
        }
        if (setScriptSort) {
            scripts['script.presort'] = this.getNodeParameter('scriptSort', i);
            scripts['script.presort.param'] = this.getNodeParameter('scriptSortParam', i);
        }
        return scripts;
    }
}
export function parsePortals(i) {
    let portals;
    const getPortalsData = this.getNodeParameter('getPortals', i);
    if (!getPortalsData) {
        portals = [];
    }
    else {
        portals = this.getNodeParameter('portals', i);
    }
    return portals;
}
export function parseQuery(i) {
    let queries;
    const queriesParamUi = this.getNodeParameter('queries', i, {});
    if (queriesParamUi.query !== undefined) {
        queries = [];
        for (const queryParam of queriesParamUi.query) {
            const query = {
                omit: queryParam.omit ? 'true' : 'false',
            };
            for (const field of queryParam.fields.field) {
                query[field.name] = field.value;
            }
            queries.push(query);
        }
    }
    else {
        queries = null;
    }
    return queries;
}
export function parseFields(i) {
    let fieldData;
    const fieldsParametersUi = this.getNodeParameter('fieldsParametersUi', i, {});
    if (fieldsParametersUi.fields !== undefined) {
        fieldData = {};
        for (const field of fieldsParametersUi.fields) {
            fieldData[field.name] = field.value;
        }
    }
    else {
        fieldData = null;
    }
    return fieldData;
}
//# sourceMappingURL=GenericFunctions.js.map