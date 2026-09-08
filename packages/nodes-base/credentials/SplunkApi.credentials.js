export class SplunkApi {
    name = 'splunkApi';
    displayName = 'Splunk API';
    documentationUrl = 'splunk';
    properties = [
        {
            displayName: 'Auth Token',
            name: 'authToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            description: 'Protocol, domain and port',
            placeholder: 'e.g. https://localhost:8089',
            default: '',
        },
        {
            displayName: 'Allow Self-Signed Certificates',
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
                Authorization: '=Bearer {{$credentials?.authToken}}',
            },
        },
    };
    test = {
        request: {
            url: '={{$credentials.baseUrl}}/services/alerts/fired_alerts',
            method: 'GET',
            skipSslCertificateValidation: '={{$credentials?.allowUnauthorizedCerts}}',
        },
    };
}
//# sourceMappingURL=SplunkApi.credentials.js.map