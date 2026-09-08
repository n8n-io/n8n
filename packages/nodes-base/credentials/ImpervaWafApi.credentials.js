export class ImpervaWafApi {
    name = 'impervaWafApi';
    displayName = 'Imperva WAF API';
    documentationUrl = 'impervawaf';
    icon = { light: 'file:icons/Imperva.svg', dark: 'file:icons/Imperva.dark.svg' };
    httpRequestNode = {
        name: 'Imperva WAF',
        docsUrl: 'https://docs.imperva.com/bundle/api-docs',
        apiBaseUrl: 'https://api.imperva.com/',
    };
    properties = [
        {
            displayName: 'API ID',
            name: 'apiID',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'x-API-Id': '={{$credentials.apiID}}',
                'x-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=ImpervaWafApi.credentials.js.map