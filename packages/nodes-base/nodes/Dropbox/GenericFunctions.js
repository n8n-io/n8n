import { NodeApiError } from 'n8n-workflow';
/**
 * Make an API request to Dropbox
 *
 */
export async function dropboxApiRequest(method, endpoint, body, query = {}, headers = {}, option = {}) {
    const options = {
        headers,
        method,
        qs: query,
        body,
        uri: endpoint,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    Object.assign(options, option);
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    try {
        if (authenticationMethod === 'accessToken') {
            return await this.helpers.requestWithAuthentication.call(this, 'dropboxApi', options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'dropboxOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function dropboxpiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}, headers = {}) {
    const resource = this.getNodeParameter('resource', 0);
    const returnData = [];
    const paginationEndpoint = {
        folder: 'https://api.dropboxapi.com/2/files/list_folder/continue',
        search: 'https://api.dropboxapi.com/2/files/search/continue_v2',
    };
    let responseData;
    do {
        responseData = await dropboxApiRequest.call(this, method, endpoint, body, query, headers);
        const cursor = responseData.cursor;
        if (cursor !== undefined) {
            endpoint = paginationEndpoint[resource];
            body = { cursor };
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.has_more !== false);
    return returnData;
}
export async function getRootDirectory() {
    return await dropboxApiRequest.call(this, 'POST', 'https://api.dropboxapi.com/2/users/get_current_account', {});
}
export function simplify(data) {
    const results = [];
    for (const element of data) {
        const { '.tag': key } = element?.metadata;
        const metadata = (element?.metadata)[key];
        delete element.metadata;
        Object.assign(element, metadata);
        if ((element?.match_type)['.tag']) {
            element.match_type = (element?.match_type)['.tag'];
        }
        results.push(element);
    }
    return results;
}
export async function getCredentials() {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    if (authenticationMethod === 'accessToken') {
        return await this.getCredentials('dropboxApi');
    }
    else {
        return await this.getCredentials('dropboxOAuth2Api');
    }
}
//# sourceMappingURL=GenericFunctions.js.map