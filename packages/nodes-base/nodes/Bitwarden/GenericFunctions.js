import { NodeApiError } from 'n8n-workflow';
/**
 * Return the access token URL based on the user's environment.
 */
async function getTokenUrl() {
    const { environment, domain } = await this.getCredentials('bitwardenApi');
    return environment === 'cloudHosted'
        ? 'https://identity.bitwarden.com/connect/token'
        : `${domain}/identity/connect/token`;
}
/**
 * Return the base API URL based on the user's environment.
 */
async function getBaseUrl() {
    const { environment, domain } = await this.getCredentials('bitwardenApi');
    return environment === 'cloudHosted' ? 'https://api.bitwarden.com' : `${domain}/api`;
}
/**
 * Make an authenticated API request to Bitwarden.
 */
export async function bitwardenApiRequest(method, endpoint, qs, body, token) {
    const baseUrl = await getBaseUrl.call(this);
    const options = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: `${baseUrl}${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Retrieve the access token needed for every API request to Bitwarden.
 */
export async function getAccessToken() {
    const credentials = await this.getCredentials('bitwardenApi');
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        form: {
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            grant_type: 'client_credentials',
            scope: 'api.organization',
            deviceName: 'n8n',
            deviceType: 2, // https://github.com/bitwarden/server/blob/master/src/Core/Enums/DeviceType.cs
            deviceIdentifier: 'n8n',
        },
        uri: await getTokenUrl.call(this),
        json: true,
    };
    try {
        const { access_token } = await this.helpers.request(options);
        return access_token;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Supplement a `getAll` operation with `returnAll` and `limit` parameters.
 */
export async function handleGetAll(i, method, endpoint, qs, body, token) {
    const responseData = await bitwardenApiRequest.call(this, method, endpoint, qs, body, token);
    const returnAll = this.getNodeParameter('returnAll', i);
    if (returnAll) {
        return responseData.data;
    }
    else {
        const limit = this.getNodeParameter('limit', i);
        return responseData.data.slice(0, limit);
    }
}
/**
 * Load a resource so that it can be selected by name from a dropdown.
 */
export async function loadResource(resource) {
    const returnData = [];
    const token = await getAccessToken.call(this);
    const endpoint = `/public/${resource}`;
    const { data } = await bitwardenApiRequest.call(this, 'GET', endpoint, {}, {}, token);
    data.forEach(({ id, name, externalId }) => {
        returnData.push({
            name: externalId || name || id,
            value: id,
        });
    });
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map