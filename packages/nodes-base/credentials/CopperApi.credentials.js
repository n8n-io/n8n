export class CopperApi {
    name = 'copperApi';
    displayName = 'Copper API';
    documentationUrl = 'copper';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Email',
            name: 'email',
            required: true,
            type: 'string',
            placeholder: 'name@email.com',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-PW-AccessToken': '={{$credentials.apiKey}}',
                'X-PW-Application': 'developer_api',
                'X-PW-UserEmail': '={{$credentials.email}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.copper.com/developer_api/v1/',
            url: 'users/me',
        },
    };
}
//# sourceMappingURL=CopperApi.credentials.js.map