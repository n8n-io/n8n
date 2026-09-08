export class ZendeskApi {
    name = 'zendeskApi';
    displayName = 'Zendesk API';
    documentationUrl = 'zendesk';
    properties = [
        {
            displayName: 'Subdomain',
            name: 'subdomain',
            type: 'string',
            description: 'The subdomain of your Zendesk work environment',
            placeholder: 'company',
            default: '',
        },
        {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            placeholder: 'name@email.com',
            default: '',
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.auth = {
            username: `${credentials.email}/token`,
            password: credentials.apiToken,
        };
        return requestOptions;
    }
    test = {
        request: {
            baseURL: '=https://{{$credentials.subdomain}}.zendesk.com/api/v2',
            url: '/ticket_fields.json',
        },
    };
}
//# sourceMappingURL=ZendeskApi.credentials.js.map