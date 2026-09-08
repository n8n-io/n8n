export class TheHiveProjectApi {
    name = 'theHiveProjectApi';
    displayName = 'The Hive 5 API';
    documentationUrl = 'thehive';
    properties = [
        {
            displayName: 'API Key',
            name: 'ApiKey',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
        {
            displayName: 'URL',
            name: 'url',
            default: '',
            type: 'string',
            description: 'The URL of TheHive instance',
            placeholder: 'https://localhost:9000',
        },
        {
            displayName: 'Ignore SSL Issues (Insecure)',
            name: 'allowUnauthorizedCerts',
            type: 'boolean',
            description: 'Whether to connect even if SSL certificate validation is not possible',
            default: false,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials?.ApiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials?.url}}',
            url: '/api/case',
        },
    };
}
//# sourceMappingURL=TheHiveProjectApi.credentials.js.map