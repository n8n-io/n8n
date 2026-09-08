export class MatrixApi {
    name = 'matrixApi';
    displayName = 'Matrix API';
    documentationUrl = 'matrix';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Homeserver URL',
            name: 'homeserverUrl',
            type: 'string',
            default: 'https://matrix-client.matrix.org',
        },
    ];
}
//# sourceMappingURL=MatrixApi.credentials.js.map