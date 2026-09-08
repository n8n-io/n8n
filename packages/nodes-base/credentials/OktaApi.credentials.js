export class OktaApi {
    name = 'oktaApi';
    displayName = 'Okta API';
    documentationUrl = 'okta';
    icon = { light: 'file:icons/Okta.svg', dark: 'file:icons/Okta.dark.svg' };
    httpRequestNode = {
        name: 'Okta',
        docsUrl: 'https://developer.okta.com/docs/reference/',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            required: true,
            default: '',
            placeholder: 'https://dev-123456.okta.com',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
            description: 'Secure Session Web Service Access Token',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=SSWS {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url}}',
            url: '/api/v1/api-tokens',
        },
    };
}
//# sourceMappingURL=OktaApi.credentials.js.map