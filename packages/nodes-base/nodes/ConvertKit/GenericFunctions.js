import { NodeApiError } from 'n8n-workflow';
export async function convertKitApiRequest(method, endpoint, body = {}, qs = {}, url, option = {}) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        url: url || `https://api.convertkit.com/v3${endpoint}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    if (Object.keys(options.qs).length === 0) {
        delete options.qs;
    }
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'convertKitApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map