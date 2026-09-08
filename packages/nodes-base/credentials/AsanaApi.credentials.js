export class AsanaApi {
    name = 'asanaApi';
    displayName = 'Asana API';
    documentationUrl = 'asana';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://app.asana.com/api/1.0',
            url: '/users/me',
        },
    };
}
//# sourceMappingURL=AsanaApi.credentials.js.map