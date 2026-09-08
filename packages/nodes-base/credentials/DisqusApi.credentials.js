export class DisqusApi {
    name = 'disqusApi';
    displayName = 'Disqus API';
    documentationUrl = 'disqus';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Visit your account details page, and grab the Access Token. See <a href="https://disqus.com/api/docs/auth/">Disqus auth</a>.',
        },
    ];
}
//# sourceMappingURL=DisqusApi.credentials.js.map