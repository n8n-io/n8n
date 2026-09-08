export class BrandfetchApi {
    name = 'brandfetchApi';
    displayName = 'Brandfetch API';
    documentationUrl = 'brandfetch';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.brandfetch.io',
            url: '/v2/brands/brandfetch.com',
        },
    };
}
//# sourceMappingURL=BrandfetchApi.credentials.js.map