export class OnfleetApi {
    name = 'onfleetApi';
    displayName = 'Onfleet API';
    documentationUrl = 'onfleet';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Signing Secret',
            name: 'signingSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Used to verify webhook authenticity. Found in Onfleet under Settings → API & Webhooks.',
        },
    ];
}
//# sourceMappingURL=OnfleetApi.credentials.js.map