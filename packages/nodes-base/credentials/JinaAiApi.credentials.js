export class JinaAiApi {
    name = 'jinaAiApi';
    displayName = 'Jina AI API';
    documentationUrl = 'jinaai';
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
                Authorization: '=Bearer {{ $credentials?.apiKey }}',
            },
        },
    };
    test = {
        request: {
            method: 'GET',
            url: 'https://embeddings-dashboard-api.jina.ai/api/v1/api_key/fe_user',
            qs: {
                api_key: '={{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=JinaAiApi.credentials.js.map