export class TravisCiApi {
    name = 'travisCiApi';
    displayName = 'Travis API';
    documentationUrl = 'travisci';
    properties = [
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=TravisCiApi.credentials.js.map