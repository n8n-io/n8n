import { NodeApiError } from 'n8n-workflow';
export async function dhlApiRequest(method, path, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('dhlApi');
    let options = {
        headers: {
            'DHL-API-Key': credentials.apiKey,
        },
        method,
        qs,
        body,
        uri: uri || `https://api-eu.dhl.com${path}`,
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
export async function validateCredentials(decryptedCredentials) {
    const credentials = decryptedCredentials;
    const { apiKey } = credentials;
    const options = {
        headers: {
            'DHL-API-Key': apiKey,
        },
        qs: {
            trackingNumber: 123,
        },
        method: 'GET',
        uri: 'https://api-eu.dhl.com/track/shipments',
        json: true,
    };
    return await this.helpers.request(options);
}
//# sourceMappingURL=GenericFunctions.js.map