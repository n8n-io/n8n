import { NodeApiError } from 'n8n-workflow';
export async function disqusApiRequest(method, qs = {}, uri, body = {}, option = {}) {
    const credentials = await this.getCredentials('disqusApi');
    qs.api_key = credentials.accessToken;
    // Convert to query string into a format the API can read
    const queryStringElements = [];
    for (const key of Object.keys(qs)) {
        if (Array.isArray(qs[key])) {
            qs[key].forEach((value) => {
                queryStringElements.push(`${key}=${value}`);
            });
        }
        else {
            queryStringElements.push(`${key}=${qs[key]}`);
        }
    }
    let options = {
        method,
        body,
        uri: `https://disqus.com/api/3.0/${uri}?${queryStringElements.join('&')}`,
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
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function disqusApiRequestAllItems(method, qs = {}, uri, body = {}, option = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await disqusApiRequest.call(this, method, qs, uri, body, option);
        qs.cursor = responseData.cursor.id;
        returnData.push.apply(returnData, responseData.response);
    } while (responseData.cursor.more === true && responseData.cursor.hasNext === true);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map