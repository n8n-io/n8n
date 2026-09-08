export class EgoiApi {
    name = 'egoiApi';
    displayName = 'E-Goi API';
    documentationUrl = 'egoi';
    properties = [
        // The credentials to get from user and save encrypted.
        // Properties can be defined exactly in the same way
        // as node properties.
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=EgoiApi.credentials.js.map