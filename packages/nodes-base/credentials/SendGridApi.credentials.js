export class SendGridApi {
    name = 'sendGridApi';
    displayName = 'SendGrid API';
    documentationUrl = 'sendgrid';
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
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.sendgrid.com/v3',
            url: '/scopes',
        },
    };
}
//# sourceMappingURL=SendGridApi.credentials.js.map