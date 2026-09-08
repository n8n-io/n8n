export class NocoDbApiToken {
    name = 'nocoDbApiToken';
    displayName = 'NocoDB API Token';
    documentationUrl = 'nocodb';
    properties = [
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: '',
            placeholder: 'https://app.nocodb.com',
            required: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'xc-token': '={{$credentials.apiToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{ $credentials.host }}',
            url: '/api/v1/auth/user/me',
        },
    };
}
//# sourceMappingURL=NocoDbApiToken.credentials.js.map