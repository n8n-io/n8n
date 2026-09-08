export class TwilioApi {
    name = 'twilioApi';
    displayName = 'Twilio API';
    documentationUrl = 'twilio';
    properties = [
        {
            displayName: 'Auth Type',
            name: 'authType',
            type: 'options',
            default: 'authToken',
            options: [
                {
                    name: 'Auth Token',
                    value: 'authToken',
                },
                {
                    name: 'API Key',
                    value: 'apiKey',
                },
            ],
        },
        {
            displayName: 'Account SID',
            name: 'accountSid',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Auth Token',
            name: 'authToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            displayOptions: {
                show: {
                    authType: ['authToken'],
                },
            },
        },
        {
            displayName: 'API Key SID',
            name: 'apiKeySid',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            displayOptions: {
                show: {
                    authType: ['apiKey'],
                },
            },
        },
        {
            displayName: 'API Key Secret',
            name: 'apiKeySecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            displayOptions: {
                show: {
                    authType: ['apiKey'],
                },
            },
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{ $credentials.authType === "apiKey" ? $credentials.apiKeySid : $credentials.accountSid }}',
                password: '={{ $credentials.authType === "apiKey" ? $credentials.apiKeySecret : $credentials.authToken }}',
            },
        },
    };
    test = {
        request: {
            url: '=https://api.twilio.com/2010-04-01/Accounts/{{$credentials.accountSid}}.json',
        },
    };
}
//# sourceMappingURL=TwilioApi.credentials.js.map