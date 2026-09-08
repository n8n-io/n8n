export class SalesmateApi {
    name = 'salesmateApi';
    displayName = 'Salesmate API';
    documentationUrl = 'salesmate';
    properties = [
        {
            displayName: 'Session Token',
            name: 'sessionToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'n8n.salesmate.io',
        },
    ];
}
//# sourceMappingURL=SalesmateApi.credentials.js.map