const scopes = ['app_configurations:read', 'app_configurations:write', 'managed_apps:install'];
export class SlackManagerOAuth2Api {
    name = 'slackManagerOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Slack Manager OAuth2 API';
    icon = 'file:../nodes/Slack/slack.svg';
    documentationUrl = 'slack';
    hideDomainRestrictionFields = true;
    hidden = true;
    restrictToSupportedNodes = true;
    supportedNodes = [];
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
            default: 'https://slack.com/oauth/v2/authorize',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://slack.com/api/oauth.v2.access',
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
            default: `={{"user_scope=${scopes.join(' ')}"}}`,
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'body',
        },
        {
            displayName: 'Allowed Domains',
            name: 'allowedHttpRequestDomains',
            type: 'hidden',
            default: 'none',
        },
    ];
}
//# sourceMappingURL=SlackManagerOAuth2Api.credentials.js.map