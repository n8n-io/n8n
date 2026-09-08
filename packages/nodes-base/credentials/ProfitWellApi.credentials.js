export class ProfitWellApi {
    name = 'profitWellApi';
    displayName = 'ProfitWell API';
    documentationUrl = 'profitwell';
    properties = [
        {
            displayName: 'API Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Your Private Token',
        },
    ];
}
//# sourceMappingURL=ProfitWellApi.credentials.js.map