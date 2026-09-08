export class GitlabOAuth2Api {
    name = 'gitlabOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'GitLab OAuth2 API';
    documentationUrl = 'gitlab';
    properties = [
        {
            displayName: 'Grant Type',
            name: 'grantType',
            type: 'hidden',
            default: 'authorizationCode',
        },
        {
            displayName: 'Gitlab Server',
            name: 'server',
            type: 'string',
            default: 'https://gitlab.com',
        },
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'hidden',
            default: '={{$self["server"]}}/oauth/authorize',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: '={{$self["server"]}}/oauth/token',
            required: true,
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: 'api',
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: '',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'body',
        },
    ];
}
//# sourceMappingURL=GitlabOAuth2Api.credentials.js.map