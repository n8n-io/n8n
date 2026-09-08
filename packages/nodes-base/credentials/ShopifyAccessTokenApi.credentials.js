export class ShopifyAccessTokenApi {
    name = 'shopifyAccessTokenApi';
    displayName = 'Shopify Access Token API';
    documentationUrl = 'shopify';
    properties = [
        {
            displayName: 'Shop Subdomain',
            name: 'shopSubdomain',
            required: true,
            type: 'string',
            default: '',
            description: 'Only the subdomain without .myshopify.com',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'APP Secret Key',
            name: 'appSecretKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Secret key needed to verify the webhook when using Shopify Trigger node',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Shopify-Access-Token': '={{$credentials?.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials?.shopSubdomain}}.myshopify.com/admin/api/2024-07',
            url: '/products.json',
        },
    };
}
//# sourceMappingURL=ShopifyAccessTokenApi.credentials.js.map