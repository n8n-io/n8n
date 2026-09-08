export class CalendlyOAuth2Api {
    name = 'calendlyOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Calendly OAuth2 API';
    documentationUrl = 'calendly';
    icon = 'file:icons/Calendly.svg';
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
            default: 'https://auth.calendly.com/oauth/authorize',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://auth.calendly.com/oauth/token',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'header',
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
            default: 'users:read webhooks:read webhooks:write scheduled_events:read',
        },
    ];
}
//# sourceMappingURL=CalendlyOAuth2Api.credentials.js.map