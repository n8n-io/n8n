import { BINARY_ENCODING } from 'n8n-workflow';
export class ShopifyApi {
    name = 'shopifyApi';
    displayName = 'Shopify API';
    documentationUrl = 'shopify';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Shop Subdomain',
            name: 'shopSubdomain',
            required: true,
            type: 'string',
            default: '',
            description: 'Only the subdomain without .myshopify.com',
        },
        {
            displayName: 'Shared Secret',
            name: 'sharedSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.headers = {
            ...requestOptions.headers,
            Authorization: `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.password}`).toString(BINARY_ENCODING)}`,
        };
        return requestOptions;
    }
    test = {
        request: {
            baseURL: '=https://{{$credentials.shopSubdomain}}.myshopify.com/admin/api/2024-07',
            url: '/products.json',
        },
    };
}
//# sourceMappingURL=ShopifyApi.credentials.js.map