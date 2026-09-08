import { NodeApiError } from 'n8n-workflow';
export async function bitlyApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    let options = {
        headers: {},
        method,
        qs,
        body,
        uri: uri || `https://api-ssl.bitly.com/v4${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        if (authenticationMethod === 'accessToken') {
            const credentials = await this.getCredentials('bitlyApi');
            options.headers = { Authorization: `Bearer ${credentials.accessToken}` };
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'bitlyOAuth2Api', options, {
                tokenType: 'Bearer',
            });
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function bitlyApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.size = 50;
    do {
        responseData = await bitlyApiRequest.call(this, method, resource, body, query, uri);
        returnData.push.apply(returnData, responseData[propertyName]);
        if (responseData.pagination?.next) {
            uri = responseData.pagination.next;
        }
    } while (responseData.pagination?.next !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map