export class ZammadTokenAuthApi {
    name = 'zammadTokenAuthApi';
    displayName = 'Zammad Token Auth API';
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
            displayName: 'Access Token',
            name: 'accessToken',
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
//# sourceMappingURL=ZammadTokenAuthApi.credentials.js.map