export class HttpQueryAuth {
    name = 'httpQueryAuth';
    displayName = 'Query Auth';
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
    ];
}
//# sourceMappingURL=HttpQueryAuth.credentials.js.map