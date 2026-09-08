export class SyncroMspApi {
    name = 'syncroMspApi';
    displayName = 'SyncroMSP API';
    documentationUrl = 'syncromsp';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Subdomain',
            name: 'subdomain',
            type: 'string',
            default: '',
        },
    ];
}
//# sourceMappingURL=SyncroMspApi.credentials.js.map