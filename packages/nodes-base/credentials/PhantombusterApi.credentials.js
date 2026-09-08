export class PhantombusterApi {
    name = 'phantombusterApi';
    displayName = 'Phantombuster API';
    documentationUrl = 'phantombuster';
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
                'X-Phantombuster-Key': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.phantombuster.com/api/v2',
            url: '/agents/fetch-all',
        },
    };
}
//# sourceMappingURL=PhantombusterApi.credentials.js.map