export class VonageApi {
    name = 'vonageApi';
    displayName = 'Vonage API';
    documentationUrl = 'vonage';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'API Secret',
            name: 'apiSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=VonageApi.credentials.js.map