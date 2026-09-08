export class OuraApi {
    name = 'ouraApi';
    displayName = 'Oura API';
    documentationUrl = 'oura';
    properties = [
        {
            displayName: 'Personal Access Token',
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
            baseURL: 'https://api.ouraring.com',
            url: '/v2/usercollection/personal_info',
        },
    };
}
//# sourceMappingURL=OuraApi.credentials.js.map