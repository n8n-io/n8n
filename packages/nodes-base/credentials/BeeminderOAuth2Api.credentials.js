export class BeeminderOAuth2Api {
    name = 'beeminderOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Beeminder OAuth2 API';
    documentationUrl = 'beeminder';
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
            default: 'https://www.beeminder.com/apps/authorize',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://www.beeminder.com/apps/authorize',
            required: true,
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: 'response_type=token',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'body',
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: '',
        },
    ];
}
//# sourceMappingURL=BeeminderOAuth2Api.credentials.js.map