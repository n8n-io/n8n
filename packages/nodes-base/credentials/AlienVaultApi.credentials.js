export class AlienVaultApi {
    name = 'alienVaultApi';
    displayName = 'AlienVault API';
    documentationUrl = 'alienvault';
    icon = 'file:icons/AlienVault.png';
    httpRequestNode = {
        name: 'AlienVault',
        docsUrl: 'https://otx.alienvault.com/api',
        apiBaseUrl: 'https://otx.alienvault.com/api/v1/',
    };
    properties = [
        {
            displayName: 'OTX Key',
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
                'X-OTX-API-KEY': '={{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://otx.alienvault.com',
            url: '/api/v1/user/me',
        },
    };
}
//# sourceMappingURL=AlienVaultApi.credentials.js.map