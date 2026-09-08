const scopes = [
    'offline_access',
    'accounting.invoices',
    'accounting.payments',
    'accounting.banktransactions',
    'accounting.manualjournals',
    'accounting.attachments',
    'accounting.settings',
    'accounting.contacts',
];
export class XeroOAuth2Api {
    name = 'xeroOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Xero OAuth2 API';
    documentationUrl = 'xero';
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
            default: 'https://login.xero.com/identity/connect/authorize',
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://identity.xero.com/connect/token',
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: scopes.join(' '),
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
//# sourceMappingURL=XeroOAuth2Api.credentials.js.map