import { NodeApiError } from 'n8n-workflow';
export async function discourseApiRequest(method, path, body = {}, qs = {}, _option = {}) {
    const credentials = await this.getCredentials('discourseApi');
    const options = {
        method,
        body,
        qs,
        uri: `${credentials.url}${path}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, 'discourseApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function discourseApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 1;
    do {
        responseData = await discourseApiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData);
        query.page++;
    } while (responseData.length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map