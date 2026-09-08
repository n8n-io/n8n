import { NodeApiError } from 'n8n-workflow';
export async function figmaApiRequest(method, resource, body = {}, _qs = {}, uri, option = {}) {
    const authentication = this.getNodeParameter('authentication', 0, 'accessToken');
    let options = {
        method,
        body,
        uri: uri || `https://api.figma.com${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        if (authentication === 'oAuth2') {
            return await this.helpers.requestWithAuthentication.call(this, 'figmaOAuth2Api', options);
        }
        const credentials = await this.getCredentials('figmaApi');
        options.headers = { 'X-FIGMA-TOKEN': credentials.accessToken };
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map