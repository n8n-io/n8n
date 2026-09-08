export class DfirIrisApi {
    name = 'dfirIrisApi';
    displayName = 'DFIR-IRIS API';
    documentationUrl = 'dfiriris';
    icon = { light: 'file:icons/DfirIris.svg', dark: 'file:icons/DfirIris.svg' };
    httpRequestNode = {
        name: 'DFIR-IRIS',
        docsUrl: 'https://docs.dfir-iris.org/operations/api/',
        apiBaseUrlPlaceholder: 'http://<yourserver_ip>/manage/cases/list',
    };
    properties = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
            placeholder: 'e.g. https://localhost',
            description: 'The API endpoints are reachable on the same Address and port as the web interface.',
            required: true,
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Ignore SSL Issues (Insecure)',
            name: 'skipSslCertificateValidation',
            type: 'boolean',
            default: false,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '/api/ping',
            method: 'GET',
            skipSslCertificateValidation: '={{$credentials.skipSslCertificateValidation}}',
        },
    };
}
//# sourceMappingURL=DfirIrisApi.credentials.js.map