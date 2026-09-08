export class WooCommerceApi {
    name = 'wooCommerceApi';
    displayName = 'WooCommerce API';
    documentationUrl = 'woocommerce';
    properties = [
        {
            displayName: 'Consumer Key',
            name: 'consumerKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Consumer Secret',
            name: 'consumerSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'WooCommerce URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://example.com',
        },
        {
            displayName: 'Include Credentials in Query',
            name: 'includeCredentialsInQuery',
            type: 'boolean',
            default: false,
            description: 'Whether credentials should be included in the query. Occasionally, some servers may not parse the Authorization header correctly (if you see a “Consumer key is missing” error when authenticating over SSL, you have a server issue). In this case, you may provide the consumer key/secret as query string parameters instead.',
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.auth = {
            // @ts-ignore
            user: credentials.consumerKey,
            password: credentials.consumerSecret,
        };
        if (credentials.includeCredentialsInQuery === true && requestOptions.qs) {
            delete requestOptions.auth;
            Object.assign(requestOptions.qs, {
                consumer_key: credentials.consumerKey,
                consumer_secret: credentials.consumerSecret,
            });
        }
        return requestOptions;
    }
    test = {
        request: {
            baseURL: '={{$credentials.url}}/wp-json/wc/v3',
            url: '/products/categories',
        },
    };
}
//# sourceMappingURL=WooCommerceApi.credentials.js.map