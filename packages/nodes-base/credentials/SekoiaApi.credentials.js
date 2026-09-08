export class SekoiaApi {
    name = 'sekoiaApi';
    displayName = 'Sekoia API';
    icon = 'file:icons/Sekoia.svg';
    documentationUrl = 'sekoia';
    httpRequestNode = {
        name: 'Sekoia',
        docsUrl: 'https://docs.sekoia.io/cti/features/integrations/api/',
        apiBaseUrl: 'https://api.sekoia.io/',
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
                Authorization: '=Bearer {{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=SekoiaApi.credentials.js.map