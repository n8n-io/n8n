export class HarvestOAuth2Api {
    name = 'harvestOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Harvest OAuth2 API';
    documentationUrl = 'harvest';
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
            default: 'https://id.getharvest.com/oauth2/authorize',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://id.getharvest.com/api/v2/oauth2/token',
            required: true,
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: 'all',
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
//# sourceMappingURL=HarvestOAuth2Api.credentials.js.map