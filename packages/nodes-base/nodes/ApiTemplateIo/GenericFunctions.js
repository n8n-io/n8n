import { NodeApiError } from 'n8n-workflow';
export async function apiTemplateIoApiRequest(method, endpoint, qs = {}, body = {}) {
    const options = {
        headers: {
            Accept: 'application/json',
        },
        uri: `https://api.apitemplate.io/v1${endpoint}`,
        method,
        qs,
        body,
        followRedirect: true,
        followAllRedirects: true,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        const response = await this.helpers.requestWithAuthentication.call(this, 'apiTemplateIoApi', options);
        if (response.status === 'error') {
            throw new NodeApiError(this.getNode(), response.message);
        }
        return response;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function loadResource(resource) {
    const target = resource === 'image' ? ['JPEG', 'PNG'] : ['PDF'];
    const templates = await apiTemplateIoApiRequest.call(this, 'GET', '/list-templates');
    const filtered = templates.filter(({ format }) => target.includes(format));
    return filtered.map(({ format, name, id }) => ({
        name: `${name} (${format})`,
        value: id,
    }));
}
export function validateJSON(json) {
    let result;
    if (typeof json === 'object') {
        return json;
    }
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
export async function downloadImage(url) {
    return await this.helpers.request({
        uri: url,
        method: 'GET',
        json: false,
        encoding: null,
    });
}
//# sourceMappingURL=GenericFunctions.js.map