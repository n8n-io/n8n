import { NodeApiError } from 'n8n-workflow';
export async function demioApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    try {
        const credentials = await this.getCredentials('demioApi');
        let options = {
            headers: {
                'Api-Key': credentials.apiKey,
                'Api-Secret': credentials.apiSecret,
            },
            method,
            qs,
            body,
            uri: uri || `https://my.demio.com/api/v1${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map