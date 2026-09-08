export class GongApi {
    name = 'gongApi';
    displayName = 'Gong API';
    documentationUrl = 'gong';
    properties = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'https://api.gong.io',
        },
        {
            displayName: 'Access Key',
            name: 'accessKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Access Key Secret',
            name: 'accessKeySecret',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{ $credentials.accessKey }}',
                password: '={{ $credentials.accessKeySecret }}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
            url: '/v2/users',
        },
    };
}
//# sourceMappingURL=GongApi.credentials.js.map