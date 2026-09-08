export class MalcoreApi {
    name = 'malcoreApi';
    displayName = 'Malcore API';
    documentationUrl = 'malcore';
    icon = { light: 'file:icons/Malcore.png', dark: 'file:icons/Malcore.png' };
    httpRequestNode = {
        name: 'Malcore',
        docsUrl: 'https://malcore.readme.io/reference/upload',
        apiBaseUrlPlaceholder: 'https://api.malcore.io/api/urlcheck',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                apiKey: '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.malcore.io/api',
            url: '/urlcheck',
            method: 'POST',
            body: { url: 'google.com' },
        },
    };
}
//# sourceMappingURL=MalcoreApi.credentials.js.map