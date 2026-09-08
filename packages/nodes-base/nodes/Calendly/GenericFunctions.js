export function getCredentialsType() {
    const authentication = this.getNodeParameter('authentication', 0, 'oAuth2');
    return authentication === 'apiKey' ? 'calendlyApi' : 'calendlyOAuth2Api';
}
export async function calendlyApiRequest(method, resource, body = {}, query = {}, uri, option = {}) {
    const headers = {
        'Content-Type': 'application/json',
    };
    const endpoint = 'https://api.calendly.com';
    let options = {
        headers,
        method,
        body,
        qs: query,
        uri: uri || `${endpoint}${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    options = Object.assign({}, options, option);
    const credentialsType = getCredentialsType.call(this);
    return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}
//# sourceMappingURL=GenericFunctions.js.map