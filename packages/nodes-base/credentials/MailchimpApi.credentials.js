export class MailchimpApi {
    name = 'mailchimpApi';
    displayName = 'Mailchimp API';
    documentationUrl = 'mailchimp';
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
                Authorization: '=apikey {{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials.apiKey.split("-").pop()}}.api.mailchimp.com/3.0',
            url: '/lists',
        },
    };
}
//# sourceMappingURL=MailchimpApi.credentials.js.map