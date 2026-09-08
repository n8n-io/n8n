export class BeeminderApi {
    name = 'beeminderApi';
    displayName = 'Beeminder API';
    documentationUrl = 'beeminder';
    properties = [
        {
            displayName: 'Auth Token',
            name: 'authToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            body: {
                auth_token: '={{$credentials.authToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://www.beeminder.com/api/v1',
            url: '/users/me.json',
        },
    };
}
//# sourceMappingURL=BeeminderApi.credentials.js.map