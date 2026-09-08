export class PayPalApi {
    name = 'payPalApi';
    displayName = 'PayPal API';
    documentationUrl = 'paypal';
    properties = [
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Secret',
            name: 'secret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Environment',
            name: 'env',
            type: 'options',
            default: 'live',
            options: [
                {
                    name: 'Sandbox',
                    value: 'sanbox',
                },
                {
                    name: 'Live',
                    value: 'live',
                },
            ],
        },
    ];
}
//# sourceMappingURL=PayPalApi.credentials.js.map