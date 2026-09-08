export class FreshworksCrmApi {
    name = 'freshworksCrmApi';
    displayName = 'Freshworks CRM API';
    documentationUrl = 'freshdesk';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            placeholder: 'BDsTn15vHezBlt_XGp3Tig',
        },
        {
            displayName: 'Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'n8n-org',
            description: 'Domain in the Freshworks CRM org URL. For example, in <code>https://n8n-org.myfreshworks.com</code>, the domain is <code>n8n-org</code>.',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Token token={{$credentials?.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials?.domain}}.myfreshworks.com/crm/sales/api',
            url: '/tasks',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=FreshworksCrmApi.credentials.js.map