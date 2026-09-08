export class GitlabApi {
    name = 'gitlabApi';
    displayName = 'GitLab API';
    documentationUrl = 'gitlab';
    properties = [
        {
            displayName: 'Gitlab Server',
            name: 'server',
            type: 'string',
            default: 'https://gitlab.com',
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
                'Private-Token': '={{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.server.replace(new RegExp("/$"), "") + "/api/v4" }}',
            url: '/personal_access_tokens/self',
        },
    };
}
//# sourceMappingURL=GitlabApi.credentials.js.map