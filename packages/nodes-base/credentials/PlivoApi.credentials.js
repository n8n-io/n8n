export class PlivoApi {
    name = 'plivoApi';
    displayName = 'Plivo API';
    documentationUrl = 'plivo';
    properties = [
        {
            displayName: 'Auth ID',
            name: 'authId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Auth Token',
            name: 'authToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=PlivoApi.credentials.js.map