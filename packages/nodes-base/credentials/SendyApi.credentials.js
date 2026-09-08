export class SendyApi {
    name = 'sendyApi';
    displayName = 'Sendy API';
    documentationUrl = 'sendy';
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://yourdomain.com',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=SendyApi.credentials.js.map