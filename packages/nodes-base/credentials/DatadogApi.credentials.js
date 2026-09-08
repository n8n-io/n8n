export class DatadogApi {
    name = 'datadogApi';
    displayName = 'Datadog API';
    documentationUrl = 'datadog';
    icon = { light: 'file:icons/Datadog.svg', dark: 'file:icons/Datadog.svg' };
    httpRequestNode = {
        name: 'Datadog',
        docsUrl: 'https://docs.datadoghq.com/api/latest/',
        apiBaseUrlPlaceholder: 'https://api.datadoghq.com/api/v1/metrics',
    };
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            required: true,
            type: 'string',
            default: 'https://api.datadoghq.com',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'APP Key',
            name: 'appKey',
            required: false,
            type: 'string',
            default: '',
            typeOptions: { password: true },
            description: 'For some endpoints, you also need an Application key.',
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.headers = {
            'DD-API-KEY': credentials.apiKey,
            'DD-APPLICATION-KEY': credentials.appKey,
        };
        if (!requestOptions.headers['DD-APPLICATION-KEY']) {
            delete requestOptions.headers['DD-APPLICATION-KEY'];
        }
        return requestOptions;
    }
    test = {
        request: {
            baseURL: '={{$credentials.url}}',
            url: '/api/v1/validate',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=DatadogApi.credentials.js.map