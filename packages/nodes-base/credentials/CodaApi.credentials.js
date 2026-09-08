export class CodaApi {
    name = 'codaApi';
    displayName = 'Coda API';
    documentationUrl = 'coda';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    test = {
        request: {
            baseURL: 'https://coda.io/apis/v1/whoami',
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
}
//# sourceMappingURL=CodaApi.credentials.js.map