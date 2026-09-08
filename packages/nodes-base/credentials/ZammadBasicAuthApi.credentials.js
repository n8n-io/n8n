export class ZammadBasicAuthApi {
    name = 'zammadBasicAuthApi';
    displayName = 'Zammad Basic Auth API';
    documentationUrl = 'zammad';
    properties = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
            placeholder: 'https://n8n-helpdesk.zammad.com',
            required: true,
        },
        {
            displayName: 'Email',
            name: 'username',
            type: 'string',
            default: '',
            placeholder: 'helpdesk@n8n.io',
            required: true,
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
        {
            displayName: 'Ignore SSL Issues (Insecure)',
            name: 'allowUnauthorizedCerts',
            type: 'boolean',
            description: 'Whether to connect even if SSL certificate validation is not possible',
            default: false,
        },
    ];
}
//# sourceMappingURL=ZammadBasicAuthApi.credentials.js.map