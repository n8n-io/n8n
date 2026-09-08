export class GithubApi {
    name = 'githubApi';
    displayName = 'GitHub API';
    documentationUrl = 'github';
    properties = [
        {
            displayName: 'Github Server',
            name: 'server',
            type: 'string',
            default: 'https://api.github.com',
            description: 'The server to connect to. Only has to be set if Github Enterprise is used.',
        },
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            default: '',
        },
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
                Authorization: '=token {{$credentials?.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials?.server}}',
            url: '/user',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=GithubApi.credentials.js.map