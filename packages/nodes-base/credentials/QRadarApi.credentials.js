export class QRadarApi {
    name = 'qRadarApi';
    displayName = 'QRadar API';
    icon = { light: 'file:icons/IBM.svg', dark: 'file:icons/IBM.dark.svg' };
    documentationUrl = 'qradar';
    httpRequestNode = {
        name: 'QRadar',
        docsUrl: 'https://www.ibm.com/docs/en/qradar-common',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
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
                SEC: '={{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=QRadarApi.credentials.js.map