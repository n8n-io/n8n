export class GumroadApi {
    name = 'gumroadApi';
    displayName = 'Gumroad API';
    documentationUrl = 'gumroad';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            qs: {
                access_token: '={{$credentials.accessToken}}',
            },
        },
    };
}
//# sourceMappingURL=GumroadApi.credentials.js.map