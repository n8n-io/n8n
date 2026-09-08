export class RundeckApi {
    name = 'rundeckApi';
    displayName = 'Rundeck API';
    documentationUrl = 'rundeck';
    properties = [
        {
            displayName: 'Url',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'http://127.0.0.1:4440',
        },
        {
            displayName: 'Token',
            name: 'token',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'SSL Certificate Validation',
            name: 'sslCertificateValidation',
            type: 'options',
            options: [
                {
                    name: 'Default',
                    value: 'default',
                    description: 'Validate certificates for Rundeck nodes of version 1.1 and newer, skip validation for older nodes',
                },
                {
                    name: 'Enabled',
                    value: 'enabled',
                    description: 'Always validate SSL certificates',
                },
                {
                    name: 'Disabled',
                    value: 'disabled',
                    description: 'Connect even if SSL certificate validation is not possible',
                },
            ],
            default: 'default',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Rundeck-Auth-Token': '={{$credentials?.token}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url}}',
            url: '/api/14/system/info',
            method: 'GET',
            skipSslCertificateValidation: '={{$credentials.sslCertificateValidation === "disabled"}}',
        },
    };
}
//# sourceMappingURL=RundeckApi.credentials.js.map