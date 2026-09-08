export class PaddleApi {
    name = 'paddleApi';
    displayName = 'Paddle API';
    documentationUrl = 'paddle';
    properties = [
        {
            displayName: 'Vendor Auth Code',
            name: 'vendorAuthCode',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Vendor ID',
            name: 'vendorId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Use Sandbox Environment API',
            name: 'sandbox',
            type: 'boolean',
            default: false,
        },
    ];
}
//# sourceMappingURL=PaddleApi.credentials.js.map