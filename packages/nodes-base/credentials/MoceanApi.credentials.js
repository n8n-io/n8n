export class MoceanApi {
    name = 'moceanApi';
    displayName = 'Mocean Api';
    documentationUrl = 'mocean';
    properties = [
        // The credentials to get from user and save encrypted.
        // Properties can be defined exactly in the same way
        // as node properties.
        {
            displayName: 'API Key',
            name: 'mocean-api-key',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'API Secret',
            name: 'mocean-api-secret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=MoceanApi.credentials.js.map