export class WufooApi {
    name = 'wufooApi';
    displayName = 'Wufoo API';
    documentationUrl = 'wufoo';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Subdomain',
            name: 'subdomain',
            type: 'string',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.apiKey}}',
                password: 'not-needed',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials.subdomain}}.wufoo.com',
            url: '/api/v3/forms.json',
        },
    };
}
//# sourceMappingURL=WufooApi.credentials.js.map