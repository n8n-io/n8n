export class PagerDutyOAuth2Api {
    name = 'pagerDutyOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'PagerDuty OAuth2 API';
    documentationUrl = 'pagerduty';
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
            default: 'https://app.pagerduty.com/oauth/authorize',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://app.pagerduty.com/oauth/token',
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: '',
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: 'write',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'header',
        },
    ];
}
//# sourceMappingURL=PagerDutyOAuth2Api.credentials.js.map