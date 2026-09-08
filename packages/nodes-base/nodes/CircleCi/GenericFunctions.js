import { NodeApiError } from 'n8n-workflow';
export async function circleciApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('circleCiApi');
    let options = {
        headers: {
            'Circle-Token': credentials.apiKey,
            Accept: 'application/json',
        },
        method,
        qs,
        body,
        uri: uri || `https://circleci.com/api/v2${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to paginated CircleCI endpoint
 * and return all results
 */
export async function circleciApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await circleciApiRequest.call(this, method, resource, body, query);
        returnData.push.apply(returnData, responseData[propertyName]);
        query['page-token'] = responseData.next_page_token;
    } while (responseData.next_page_token !== undefined && responseData.next_page_token !== null);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map