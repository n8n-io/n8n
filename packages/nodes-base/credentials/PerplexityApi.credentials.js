export class PerplexityApi {
    name = 'perplexityApi';
    displayName = 'Perplexity API';
    documentationUrl = 'perplexity';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
            description: 'Your Perplexity API key. Get it from your Perplexity account.',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
                'X-Source': 'n8n',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.perplexity.ai',
            url: '/chat/completions',
            method: 'POST',
            body: {
                model: 'sonar',
                messages: [{ role: 'user', content: 'test' }],
            },
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
                'Content-Type': 'application/json',
            },
            json: true,
        },
    };
}
//# sourceMappingURL=PerplexityApi.credentials.js.map