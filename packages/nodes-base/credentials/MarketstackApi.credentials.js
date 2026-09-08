export class MarketstackApi {
    name = 'marketstackApi';
    displayName = 'Marketstack API';
    documentationUrl = 'marketstack';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Use HTTPS',
            name: 'useHttps',
            type: 'boolean',
            default: false,
            description: 'Whether to use HTTPS (paid plans only)',
        },
    ];
}
//# sourceMappingURL=MarketstackApi.credentials.js.map