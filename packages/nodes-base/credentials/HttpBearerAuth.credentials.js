// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class HttpBearerAuth {
    // eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
    name = 'httpBearerAuth';
    displayName = 'Bearer Auth';
    documentationUrl = 'httprequest';
    genericAuth = true;
    icon = 'node:n8n-nodes-base.httpRequest';
    properties = [
        {
            displayName: 'Bearer Token',
            name: 'token',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            resolvableField: true,
        },
        {
            displayName: 'This credential uses the "Authorization" header. To use a custom header, use a "Header Auth" credential instead',
            name: 'useCustomAuth',
            type: 'notice',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.token}}',
            },
        },
    };
}
//# sourceMappingURL=HttpBearerAuth.credentials.js.map