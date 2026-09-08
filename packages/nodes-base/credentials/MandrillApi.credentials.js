export class MandrillApi {
    name = 'mandrillApi';
    displayName = 'Mandrill API';
    documentationUrl = 'mandrill';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=MandrillApi.credentials.js.map