export class HybridAnalysisApi {
    name = 'hybridAnalysisApi';
    displayName = 'Hybrid Analysis API';
    documentationUrl = 'hybridanalysis';
    icon = 'file:icons/Hybrid.png';
    httpRequestNode = {
        name: 'Hybrid Analysis',
        docsUrl: 'https://www.hybrid-analysis.com/docs/api/v2',
        apiBaseUrl: 'https://www.hybrid-analysis.com/api/',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'api-key': '={{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=HybridAnalysisApi.credentials.js.map