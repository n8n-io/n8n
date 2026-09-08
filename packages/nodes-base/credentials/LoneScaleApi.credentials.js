export class LoneScaleApi {
    name = 'loneScaleApi';
    displayName = 'LoneScale API';
    documentationUrl = 'lonescale';
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
                Authorization: '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://public-api.lonescale.com',
            url: '/users',
        },
    };
}
//# sourceMappingURL=LoneScaleApi.credentials.js.map