export class PhilipsHueOAuth2Api {
    name = 'philipsHueOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'PhilipHue OAuth2 API';
    documentationUrl = 'philipshue';
    properties = [
        {
            displayName: 'Grant Type',
            name: 'grantType',
            type: 'hidden',
            default: 'authorizationCode',
        },
        {
            displayName: 'APP ID',
            name: 'appId',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'hidden',
            default: 'https://api.meethue.com/v2/oauth2/authorize',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://api.meethue.com/v2/oauth2/token',
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: '={{"appid="+$self["appId"]}}',
        },
        {
            displayName: 'Scope',
            name: 'scope',
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
//# sourceMappingURL=PhilipsHueOAuth2Api.credentials.js.map