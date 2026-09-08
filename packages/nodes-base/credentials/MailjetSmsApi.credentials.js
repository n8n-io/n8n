export class MailjetSmsApi {
    name = 'mailjetSmsApi';
    displayName = 'Mailjet SMS API';
    documentationUrl = 'mailjet';
    properties = [
        {
            displayName: 'Token',
            name: 'token',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.token}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.mailjet.com',
            url: '/v4/sms',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=MailjetSmsApi.credentials.js.map