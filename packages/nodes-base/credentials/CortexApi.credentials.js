export class CortexApi {
    name = 'cortexApi';
    displayName = 'Cortex API';
    documentationUrl = 'cortex';
    properties = [
        {
            displayName: 'API Key',
            name: 'cortexApiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Cortex Instance',
            name: 'host',
            type: 'string',
            description: 'The URL of the Cortex instance',
            default: '',
            placeholder: 'https://localhost:9001',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.cortexApiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.host}}',
            url: '/api/analyzer',
        },
    };
}
//# sourceMappingURL=CortexApi.credentials.js.map