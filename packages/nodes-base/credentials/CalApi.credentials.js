export class CalApi {
    name = 'calApi';
    displayName = 'Cal API';
    documentationUrl = 'cal';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: 'https://api.cal.com',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{ $credentials.apiKey }}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{ $credentials.host }}',
            url: '=/v2/me',
        },
    };
}
//# sourceMappingURL=CalApi.credentials.js.map