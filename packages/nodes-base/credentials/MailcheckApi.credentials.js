export class MailcheckApi {
    name = 'mailcheckApi';
    displayName = 'Mailcheck API';
    documentationUrl = 'mailcheck';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=MailcheckApi.credentials.js.map