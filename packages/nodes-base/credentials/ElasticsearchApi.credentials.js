export class ElasticsearchApi {
    name = 'elasticsearchApi';
    displayName = 'Elasticsearch API';
    documentationUrl = 'elasticsearch';
    properties = [
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
            placeholder: 'https://mydeployment.es.us-central1.gcp.cloud.es.io:9243',
            description: "Referred to as Elasticsearch 'endpoint' in the Elastic deployment dashboard",
        },
        {
            displayName: 'Ignore SSL Issues (Insecure)',
            name: 'ignoreSSLIssues',
            type: 'boolean',
            default: false,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.username}}',
                password: '={{$credentials.password}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.baseUrl}}'.replace(/\/$/, ''),
            url: '/_xpack?human=false',
            skipSslCertificateValidation: '={{$credentials.ignoreSSLIssues}}',
        },
    };
}
//# sourceMappingURL=ElasticsearchApi.credentials.js.map