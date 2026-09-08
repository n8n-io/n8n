export class IntercomApi {
    name = 'intercomApi';
    displayName = 'Intercom API';
    documentationUrl = 'intercom';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
                Accept: 'application/json',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.intercom.io',
            url: '/me',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=IntercomApi.credentials.js.map