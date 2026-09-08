export class MailchimpOAuth2Api {
    name = 'mailchimpOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Mailchimp OAuth2 API';
    documentationUrl = 'mailchimp';
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
            default: 'https://login.mailchimp.com/oauth2/authorize',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://login.mailchimp.com/oauth2/token',
            required: true,
        },
        {
            displayName: 'Metadata',
            name: 'metadataUrl',
            type: 'hidden',
            default: 'https://login.mailchimp.com/oauth2/metadata',
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
            default: 'body',
        },
    ];
}
//# sourceMappingURL=MailchimpOAuth2Api.credentials.js.map