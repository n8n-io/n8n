export class FreshdeskApi {
    name = 'freshdeskApi';
    displayName = 'Freshdesk API';
    documentationUrl = 'freshdesk';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Domain',
            name: 'domain',
            type: 'string',
            placeholder: 'company',
            description: 'If the URL you get displayed on Freshdesk is "https://company.freshdesk.com" enter "company"',
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.apiKey}}',
                password: 'X',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials.domain}}.freshdesk.com/api/v2',
            url: '/agents/me',
        },
    };
}
//# sourceMappingURL=FreshdeskApi.credentials.js.map