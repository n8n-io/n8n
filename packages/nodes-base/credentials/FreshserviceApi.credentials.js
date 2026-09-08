export class FreshserviceApi {
    name = 'freshserviceApi';
    displayName = 'Freshservice API';
    documentationUrl = 'freshservice';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            placeholder: 'atuH3AbeH9HsKvgHuxg',
        },
        {
            displayName: 'Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'n8n',
            description: 'Domain in the Freshservice org URL. For example, in <code>https://n8n.freshservice.com</code>, the domain is <code>n8n</code>',
        },
    ];
}
//# sourceMappingURL=FreshserviceApi.credentials.js.map