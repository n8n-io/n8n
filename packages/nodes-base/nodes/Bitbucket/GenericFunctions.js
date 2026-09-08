import { NodeApiError } from 'n8n-workflow';
export async function bitbucketApiRequest(method, resource, body = {}, qs = {}, uri) {
    try {
        const authentication = this.getNodeParameter('authentication', 0);
        if (authentication === 'accessToken') {
            const httpRequestOptions = {
                method,
                qs,
                body,
                url: uri || `https://api.bitbucket.org/2.0${resource}`,
                json: true,
            };
            if (Object.keys(httpRequestOptions.body).length === 0) {
                delete httpRequestOptions.body;
            }
            return await this.helpers.httpRequestWithAuthentication.call(this, 'bitbucketAccessTokenApi', httpRequestOptions);
        }
        const credentials = await this.getCredentials('bitbucketApi');
        const options = {
            method,
            auth: {
                user: credentials.username,
                password: credentials.appPassword,
            },
            qs,
            body,
            uri: uri || `https://api.bitbucket.org/2.0${resource}`,
            json: true,
        };
        if (Object.keys(options.body).length === 0) {
            delete options.body;
        }
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
export async function bitbucketApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    do {
        responseData = await bitbucketApiRequest.call(this, method, resource, body, query, uri);
        uri = responseData.next;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.next !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map