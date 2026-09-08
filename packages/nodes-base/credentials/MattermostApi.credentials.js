export class MattermostApi {
    name = 'mattermostApi';
    displayName = 'Mattermost API';
    documentationUrl = 'mattermost';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
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
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}/api/v4',
            url: '/users',
            skipSslCertificateValidation: '={{$credentials?.allowUnauthorizedCerts}}',
        },
    };
}
//# sourceMappingURL=MattermostApi.credentials.js.map