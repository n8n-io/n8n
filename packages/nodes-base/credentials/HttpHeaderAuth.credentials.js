export class HttpHeaderAuth {
    name = 'httpHeaderAuth';
    displayName = 'Header Auth';
    documentationUrl = 'httprequest';
    genericAuth = true;
    icon = 'node:n8n-nodes-base.httpRequest';
    properties = [
        {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Value',
            name: 'value',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'To send multiple headers, use a "Custom Auth" credential instead',
            name: 'useCustomAuth',
            type: 'notice',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                '={{$credentials.name}}': '={{$credentials.value}}',
            },
        },
    };
}
//# sourceMappingURL=HttpHeaderAuth.credentials.js.map