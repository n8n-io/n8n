export class TapfiliateApi {
    name = 'tapfiliateApi';
    displayName = 'Tapfiliate API';
    documentationUrl = 'tapfiliate';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=TapfiliateApi.credentials.js.map