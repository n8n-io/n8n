export class PostmarkApi {
    name = 'postmarkApi';
    displayName = 'Postmark API';
    documentationUrl = 'postmark';
    properties = [
        {
            displayName: 'Server API Token',
            name: 'serverToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Postmark-Server-Token': '={{$credentials.serverToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.postmarkapp.com',
            url: '/server',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=PostmarkApi.credentials.js.map