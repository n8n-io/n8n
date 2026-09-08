export class ChargebeeApi {
    name = 'chargebeeApi';
    displayName = 'Chargebee API';
    documentationUrl = 'chargebee';
    properties = [
        {
            displayName: 'Account Name',
            name: 'accountName',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Api Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=ChargebeeApi.credentials.js.map