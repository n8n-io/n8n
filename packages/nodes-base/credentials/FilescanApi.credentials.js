export class FilescanApi {
    name = 'filescanApi';
    displayName = 'Filescan API';
    documentationUrl = 'filescan';
    icon = { light: 'file:icons/Filescan.svg', dark: 'file:icons/Filescan.svg' };
    httpRequestNode = {
        name: 'Filescan',
        docsUrl: 'https://www.filescan.io/api/docs',
        apiBaseUrlPlaceholder: 'https://www.filescan.io/api/system/do-healthcheck',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            required: true,
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Api-Key': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://www.filescan.io/api',
            url: '/system/do-healthcheck',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=FilescanApi.credentials.js.map