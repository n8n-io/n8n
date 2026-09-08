export class GrafanaApi {
    name = 'grafanaApi';
    displayName = 'Grafana API';
    documentationUrl = 'grafana';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
            description: 'Base URL of your Grafana instance',
            placeholder: 'e.g. https://n8n.grafana.net/',
            required: true,
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
            baseURL: '={{$credentials.baseUrl.replace(new RegExp("/$"), "") + "/api" }}',
            url: '/folders',
        },
    };
}
//# sourceMappingURL=GrafanaApi.credentials.js.map