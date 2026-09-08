export class DeepLApi {
    name = 'deepLApi';
    displayName = 'DeepL API';
    documentationUrl = 'deepl';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'API Plan',
            name: 'apiPlan',
            type: 'options',
            options: [
                {
                    name: 'Pro Plan',
                    value: 'pro',
                },
                {
                    name: 'Free Plan',
                    value: 'free',
                },
            ],
            default: 'pro',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '={{ "DeepL-Auth-Key " + $credentials.apiKey }}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.apiPlan === "pro" ? "https://api.deepl.com/v2" : "https://api-free.deepl.com/v2" }}',
            url: '/usage',
        },
    };
}
//# sourceMappingURL=DeepLApi.credentials.js.map