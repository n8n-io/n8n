export class HttpCustomAuth {
    name = 'httpCustomAuth';
    displayName = 'Custom Auth';
    documentationUrl = 'httprequest';
    genericAuth = true;
    icon = 'node:n8n-nodes-base.httpRequest';
    properties = [
        {
            displayName: 'JSON',
            name: 'json',
            type: 'json',
            required: true,
            description: 'Use json to specify authentication values for headers, body and qs.',
            placeholder: '{ "headers": { "key" : "value" }, "body": { "key": "value" }, "qs": { "key": "value" } }',
            default: '',
            typeOptions: {
                redactJsonLeaves: true,
            },
        },
    ];
}
//# sourceMappingURL=HttpCustomAuth.credentials.js.map