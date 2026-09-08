export class UnleashedSoftwareApi {
    name = 'unleashedSoftwareApi';
    displayName = 'Unleashed API';
    documentationUrl = 'unleashedsoftware';
    properties = [
        {
            displayName: 'API ID',
            name: 'apiId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
    ];
}
//# sourceMappingURL=UnleashedSoftwareApi.credentials.js.map