export class WhatsAppApi {
    name = 'whatsAppApi';
    displayName = 'WhatsApp API';
    documentationUrl = 'whatsapp';
    properties = [
        {
            displayName: 'Access Token',
            type: 'string',
            typeOptions: { password: true },
            name: 'accessToken',
            default: '',
            required: true,
        },
        {
            displayName: 'Business Account ID',
            type: 'string',
            name: 'businessAccountId',
            default: '',
            required: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://graph.facebook.com/v13.0',
            url: '/',
            ignoreHttpStatusErrors: true,
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'error.type',
                    value: 'OAuthException',
                    message: 'Invalid access token',
                },
            },
        ],
    };
}
//# sourceMappingURL=WhatsAppApi.credentials.js.map