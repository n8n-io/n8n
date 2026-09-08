export class AcuitySchedulingOAuth2Api {
    name = 'acuitySchedulingOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'AcuityScheduling OAuth2 API';
    documentationUrl = 'acuityscheduling';
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
            default: 'https://acuityscheduling.com/oauth2/authorize',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://acuityscheduling.com/oauth2/token',
            required: true,
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: 'api-v1',
            required: true,
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
//# sourceMappingURL=AcuitySchedulingOAuth2Api.credentials.js.map