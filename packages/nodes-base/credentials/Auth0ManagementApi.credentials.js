export class Auth0ManagementApi {
    name = 'auth0ManagementApi';
    displayName = 'Auth0 Management API';
    documentationUrl = 'auth0management';
    icon = { light: 'file:icons/Auth0.svg', dark: 'file:icons/Auth0.dark.svg' };
    httpRequestNode = {
        name: 'Auth0',
        docsUrl: 'https://auth0.com/docs/api/management/v2',
        apiBaseUrlPlaceholder: 'https://your-tenant.auth0.com/api/v2/users/',
    };
    properties = [
        {
            displayName: 'Session Token',
            name: 'sessionToken',
            type: 'hidden',
            typeOptions: {
                expirable: true,
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Auth0 Domain',
            name: 'domain',
            type: 'string',
            required: true,
            default: 'your-domain.eu.auth0.com',
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            required: true,
            default: '',
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            required: true,
            default: '',
        },
    ];
    async preAuthentication(credentials) {
        const { access_token } = (await this.helpers.httpRequest({
            method: 'POST',
            url: `https://${credentials.domain}/oauth/token`,
            body: {
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret,
                audience: `https://${credentials.domain}/api/v2/`,
                grant_type: 'client_credentials',
            },
            headers: {
                'Content-Type': 'application/json',
            },
        }));
        return { sessionToken: access_token };
    }
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.sessionToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials.domain}}',
            url: '/api/v2/clients',
        },
    };
}
//# sourceMappingURL=Auth0ManagementApi.credentials.js.map