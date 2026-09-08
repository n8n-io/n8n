export class GetResponseOAuth2Api {
    name = 'getResponseOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'GetResponse OAuth2 API';
    documentationUrl = 'getresponse';
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
            default: 'https://app.getresponse.com/oauth2_authorize.html',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://api.getresponse.com/v3/token',
            required: true,
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: '',
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
            default: 'header',
        },
    ];
}
//# sourceMappingURL=GetResponseOAuth2Api.credentials.js.map