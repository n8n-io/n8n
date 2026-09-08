export class GoogleOAuth2Api {
    name = 'googleOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Google OAuth2 API';
    documentationUrl = 'google/oauth-generic';
    icon = 'file:icons/Google.svg';
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
            default: 'https://accounts.google.com/o/oauth2/v2/auth',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://oauth2.googleapis.com/token',
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: 'access_type=offline&prompt=consent',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'body',
        },
    ];
}
//# sourceMappingURL=GoogleOAuth2Api.credentials.js.map