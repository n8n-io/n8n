export class ApiTemplateIoApi {
    name = 'apiTemplateIoApi';
    displayName = 'APITemplate.io API';
    documentationUrl = 'apitemplateio';
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
                'X-API-KEY': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.apitemplate.io/v1',
            url: '/list-templates',
        },
    };
}
//# sourceMappingURL=ApiTemplateIoApi.credentials.js.map