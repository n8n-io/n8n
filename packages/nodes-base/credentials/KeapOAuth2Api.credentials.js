const scopes = ['full'];
export class KeapOAuth2Api {
    name = 'keapOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Keap OAuth2 API';
    documentationUrl = 'keap';
    properties = [
        {
            displayName: 'Grant Type',
            name: 'grantType',
            type: 'hidden',
            default: 'authorizationCode',
        },
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'hidden',
            default: 'https://signin.infusionsoft.com/app/oauth/authorize',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://api.infusionsoft.com/token',
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: scopes.join(' '),
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
//# sourceMappingURL=KeapOAuth2Api.credentials.js.map