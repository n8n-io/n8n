export class HttpBasicAuth {
    name = 'httpBasicAuth';
    displayName = 'Basic Auth';
    documentationUrl = 'httprequest';
    genericAuth = true;
    icon = 'node:n8n-nodes-base.httpRequest';
    properties = [
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            default: '',
            resolvableField: true,
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            resolvableField: true,
        },
    ];
}
//# sourceMappingURL=HttpBasicAuth.credentials.js.map