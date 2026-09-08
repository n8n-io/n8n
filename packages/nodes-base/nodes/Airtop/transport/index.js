import { BASE_URL, N8N_VERSION } from '../constants';
const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-airtop-sdk-environment': 'n8n',
    'x-airtop-sdk-version': N8N_VERSION,
};
export async function apiRequest(method, endpoint, body = {}, query = {}) {
    const options = {
        headers: defaultHeaders,
        method,
        body,
        qs: query,
        url: endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`,
        json: true,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    return await this.helpers.httpRequestWithAuthentication.call(this, 'airtopApi', options);
}
//# sourceMappingURL=index.js.map