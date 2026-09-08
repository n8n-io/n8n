import { NodeApiError } from 'n8n-workflow';
export async function calApiRequest(method, resource, body = {}, query = {}, option = {}) {
    const credentials = await this.getCredentials('calApi');
    let options = {
        baseURL: credentials.host,
        method,
        body,
        qs: {
            ...query,
            apiKey: credentials.apiKey,
        },
        url: resource,
    };
    options = Object.assign({}, options, option);
    try {
        return await this.helpers.httpRequest(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function calApiRequestV2(method, resource, body = {}, query = {}, option = {}) {
    const credentials = await this.getCredentials('calApi');
    let options = {
        baseURL: credentials.host,
        method,
        body,
        qs: query,
        url: `/v2${resource}`,
    };
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    options = Object.assign({}, options, option);
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'calApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function sortOptionParameters(optionParameters) {
    optionParameters.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName < bName) {
            return -1;
        }
        if (aName > bName) {
            return 1;
        }
        return 0;
    });
    return optionParameters;
}
//# sourceMappingURL=GenericFunctions.js.map