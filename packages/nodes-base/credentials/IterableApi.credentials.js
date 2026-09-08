export class IterableApi {
    name = 'iterableApi';
    displayName = 'Iterable API';
    documentationUrl = 'iterable';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Region',
            name: 'region',
            type: 'options',
            options: [
                {
                    name: 'EDC',
                    value: 'https://api.eu.iterable.com',
                },
                {
                    name: 'USDC',
                    value: 'https://api.iterable.com',
                },
            ],
            default: 'https://api.iterable.com',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Api_Key: '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials?.region}}',
            url: '/api/webhooks',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=IterableApi.credentials.js.map