export class WordpressApi {
    name = 'wordpressApi';
    displayName = 'Wordpress API';
    documentationUrl = 'wordpress';
    properties = [
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Wordpress URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://example.com',
        },
        {
            displayName: 'Ignore SSL Issues (Insecure)',
            name: 'allowUnauthorizedCerts',
            type: 'boolean',
            description: 'Whether to connect even if SSL certificate validation is not possible',
            default: false,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.username}}',
                password: '={{$credentials.password}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials?.url}}/wp-json/wp/v2',
            url: '/users',
            method: 'GET',
            skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
        },
    };
}
//# sourceMappingURL=WordpressApi.credentials.js.map