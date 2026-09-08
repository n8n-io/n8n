export class DropcontactApi {
    name = 'dropcontactApi';
    displayName = 'Dropcontact API';
    documentationUrl = 'dropcontact';
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
                'X-Access-Token': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.dropcontact.io',
            url: '/batch',
            method: 'POST',
            body: {
                data: [{ email: '' }],
            },
        },
    };
}
//# sourceMappingURL=DropcontactApi.credentials.js.map