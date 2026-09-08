export class Rapid7InsightVmApi {
    name = 'rapid7InsightVmApi';
    displayName = 'Rapid7 InsightVM API';
    documentationUrl = 'rapid7insightvm';
    icon = {
        light: 'file:icons/Rapid7InsightVm.svg',
        dark: 'file:icons/Rapid7InsightVm.svg',
    };
    httpRequestNode = {
        name: 'Rapid7 InsightVM',
        docsUrl: 'https://docs.rapid7.com/',
        apiBaseUrlPlaceholder: 'https://insight.rapid7.com/',
    };
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            required: true,
            type: 'string',
            default: '',
        },
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
                'x-api-key': '={{$credentials.apiKey}}',
                Accept: 'application/json',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
            url: '/validate',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=Rapid7InsightVmApi.credentials.js.map