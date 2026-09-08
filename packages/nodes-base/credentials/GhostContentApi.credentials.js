export class GhostContentApi {
    name = 'ghostContentApi';
    displayName = 'Ghost Content API';
    documentationUrl = 'ghost';
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'http://localhost:3001',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.qs = {
            ...requestOptions.qs,
            key: credentials.apiKey,
        };
        return requestOptions;
    }
    test = {
        request: {
            baseURL: '={{$credentials.url}}',
            url: '/ghost/api/v3/content/settings/',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=GhostContentApi.credentials.js.map