export class GotifyApi {
    name = 'gotifyApi';
    displayName = 'Gotify API';
    documentationUrl = 'gotify';
    properties = [
        {
            displayName: 'App API Token',
            name: 'appApiToken',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: '(Optional) Needed for message creation',
        },
        {
            displayName: 'Client API Token',
            name: 'clientApiToken',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: '(Optional) Needed for everything (delete, getAll) but message creation',
        },
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            description: 'The URL of the Gotify host',
        },
        {
            displayName: 'Ignore SSL Issues (Insecure)',
            name: 'ignoreSSLIssues',
            type: 'boolean',
            default: false,
            description: 'Whether to connect even if SSL certificate validation is not possible',
        },
    ];
}
//# sourceMappingURL=GotifyApi.credentials.js.map