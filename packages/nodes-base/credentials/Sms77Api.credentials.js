export class Sms77Api {
    name = 'sms77Api';
    // eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-miscased
    displayName = 'seven API';
    documentationUrl = 'sms77';
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
                'X-Api-Key': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://gateway.seven.io/api',
            url: '/hooks',
            qs: {
                action: 'read',
            },
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'success',
                    message: 'Invalid API Key',
                    value: undefined,
                },
            },
        ],
    };
}
//# sourceMappingURL=Sms77Api.credentials.js.map