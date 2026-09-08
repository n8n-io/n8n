export class VirusTotalApi {
    name = 'virusTotalApi';
    displayName = 'VirusTotal API';
    documentationUrl = 'virustotal';
    icon = 'file:icons/VirusTotal.svg';
    httpRequestNode = {
        name: 'VirusTotal',
        docsUrl: 'https://developers.virustotal.com/reference/overview',
        apiBaseUrl: 'https://www.virustotal.com/api/v3/',
    };
    properties = [
        {
            displayName: 'API Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'x-apikey': '={{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://www.virustotal.com/api/v3',
            url: '/popular_threat_categories',
        },
    };
}
//# sourceMappingURL=VirusTotalApi.credentials.js.map