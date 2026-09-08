export class MispApi {
    name = 'mispApi';
    displayName = 'MISP API';
    documentationUrl = 'misp';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
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
            displayName: 'Allow Unauthorized Certificates',
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
                Authorization: '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.baseUrl.replace(new RegExp("/$"), "")}}',
            url: '/tags',
            skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
        },
    };
}
//# sourceMappingURL=MispApi.credentials.js.map