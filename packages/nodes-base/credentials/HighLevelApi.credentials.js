export class HighLevelApi {
    name = 'highLevelApi';
    displayName = 'HighLevel API';
    documentationUrl = 'highlevel';
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
            baseURL: 'https://rest.gohighlevel.com/v1',
            url: '/custom-values/',
        },
    };
}
//# sourceMappingURL=HighLevelApi.credentials.js.map