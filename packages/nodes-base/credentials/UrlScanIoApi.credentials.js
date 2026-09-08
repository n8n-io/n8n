export class UrlScanIoApi {
    name = 'urlScanIoApi';
    displayName = 'urlscan.io API';
    documentationUrl = 'urlscanio';
    properties = [
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
                'API-KEY': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://urlscan.io',
            url: '/user/quotas',
        },
    };
}
//# sourceMappingURL=UrlScanIoApi.credentials.js.map