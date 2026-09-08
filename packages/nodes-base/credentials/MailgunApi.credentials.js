export class MailgunApi {
    name = 'mailgunApi';
    displayName = 'Mailgun API';
    documentationUrl = 'mailgun';
    properties = [
        {
            displayName: 'API Domain',
            name: 'apiDomain',
            type: 'options',
            options: [
                {
                    name: 'api.eu.mailgun.net',
                    value: 'api.eu.mailgun.net',
                },
                {
                    name: 'api.mailgun.net',
                    value: 'api.mailgun.net',
                },
            ],
            default: 'api.mailgun.net',
            description: 'The configured mailgun API domain',
        },
        {
            displayName: 'Email Domain',
            name: 'emailDomain',
            type: 'string',
            default: '',
        },
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
            auth: {
                username: 'api',
                password: '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials.apiDomain}}/v3',
            url: '/domains',
        },
    };
}
//# sourceMappingURL=MailgunApi.credentials.js.map