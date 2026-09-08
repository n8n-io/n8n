import { snakeCase } from 'change-case';
import { NodeApiError } from 'n8n-workflow';
export async function bannerbearApiRequest(method, resource, body = {}, query = {}, uri, headers = {}) {
    const credentials = await this.getCredentials('bannerbearApi');
    const options = {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${credentials.apiKey}`,
        },
        method,
        body,
        qs: query,
        uri: uri || `https://api.bannerbear.com/v2${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.form;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    options.headers = Object.assign({}, options.headers, headers);
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function keysToSnakeCase(elements) {
    if (!Array.isArray(elements)) {
        elements = [elements];
    }
    for (const element of elements) {
        for (const key of Object.keys(element)) {
            if (key !== snakeCase(key)) {
                element[snakeCase(key)] = element[key];
                delete element[key];
            }
        }
    }
    return elements;
}
//# sourceMappingURL=GenericFunctions.js.map