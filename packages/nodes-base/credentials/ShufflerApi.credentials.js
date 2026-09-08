export class ShufflerApi {
    name = 'shufflerApi';
    displayName = 'Shuffler API';
    icon = 'file:icons/Shuffler.svg';
    documentationUrl = 'shuffler';
    httpRequestNode = {
        name: 'Shuffler',
        docsUrl: 'https://shuffler.io/docs/API',
        apiBaseUrl: 'https://shuffler.io/api/v1/',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://shuffler.io/api',
            url: '/v1/users/getusers',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=ShufflerApi.credentials.js.map