export class OAuth1Api {
    name = 'oAuth1Api';
    displayName = 'OAuth1 API';
    documentationUrl = 'httprequest';
    genericAuth = true;
    properties = [
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Consumer Key',
            name: 'consumerKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
        {
            displayName: 'Consumer Secret',
            name: 'consumerSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
        {
            displayName: 'Request Token URL',
            name: 'requestTokenUrl',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Signature Method',
            name: 'signatureMethod',
            type: 'options',
            options: [
                {
                    name: 'HMAC-SHA1',
                    value: 'HMAC-SHA1',
                },
                {
                    name: 'HMAC-SHA256',
                    value: 'HMAC-SHA256',
                },
                {
                    name: 'HMAC-SHA512',
                    value: 'HMAC-SHA512',
                },
            ],
            default: 'HMAC-SHA1',
            required: true,
        },
    ];
}
//# sourceMappingURL=OAuth1Api.credentials.js.map