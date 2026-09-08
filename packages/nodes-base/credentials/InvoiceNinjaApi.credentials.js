export class InvoiceNinjaApi {
    name = 'invoiceNinjaApi';
    displayName = 'Invoice Ninja API';
    documentationUrl = 'invoiceninja';
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            hint: 'Default URL for v4 is https://app.invoiceninja.com, for v5 it is https://invoicing.co',
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Secret',
            name: 'secret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            hint: 'This is optional, enter only if you did set a secret in your app and only if you are using v5',
        },
    ];
    test = {
        request: {
            baseURL: '={{$credentials?.url}}',
            url: '/api/v1/clients',
            method: 'GET',
        },
    };
    async authenticate(credentials, requestOptions) {
        const VERSION_5_TOKEN_LENGTH = 64;
        const { apiToken, secret } = credentials;
        const tokenLength = apiToken.length;
        if (tokenLength < VERSION_5_TOKEN_LENGTH) {
            requestOptions.headers = {
                Accept: 'application/json',
                'X-Ninja-Token': apiToken,
            };
        }
        else {
            requestOptions.headers = {
                'Content-Type': 'application/json',
                'X-API-TOKEN': apiToken,
                'X-Requested-With': 'XMLHttpRequest',
                'X-API-SECRET': secret || '',
            };
        }
        return requestOptions;
    }
}
//# sourceMappingURL=InvoiceNinjaApi.credentials.js.map