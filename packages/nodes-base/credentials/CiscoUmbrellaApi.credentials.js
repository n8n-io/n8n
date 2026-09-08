export class CiscoUmbrellaApi {
    name = 'ciscoUmbrellaApi';
    displayName = 'Cisco Umbrella API';
    documentationUrl = 'ciscoumbrella';
    icon = { light: 'file:icons/Cisco.svg', dark: 'file:icons/Cisco.dark.svg' };
    httpRequestNode = {
        name: 'Cisco Umbrella',
        docsUrl: 'https://developer.cisco.com/docs/cloud-security/',
        apiBaseUrl: 'https://api.umbrella.com/',
    };
    properties = [
        {
            displayName: 'Session Token',
            name: 'sessionToken',
            type: 'hidden',
            typeOptions: {
                expirable: true,
            },
            default: '',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
        {
            displayName: 'Secret',
            name: 'secret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            required: true,
            default: '',
        },
    ];
    async preAuthentication(credentials) {
        const url = 'https://api.umbrella.com';
        const { access_token } = (await this.helpers.httpRequest({
            method: 'POST',
            url: `${url.endsWith('/') ? url.slice(0, -1) : url}/auth/v2/token?grant_type=client_credentials`,
            auth: {
                username: credentials.apiKey,
                password: credentials.secret,
            },
            headers: {
                'Content-Type': 'x-www-form-urlencoded',
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
            baseURL: 'https://api.umbrella.com',
            url: '/users',
        },
    };
}
//# sourceMappingURL=CiscoUmbrellaApi.credentials.js.map