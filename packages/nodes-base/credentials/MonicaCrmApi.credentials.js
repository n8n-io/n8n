export class MonicaCrmApi {
    name = 'monicaCrmApi';
    displayName = 'Monica CRM API';
    documentationUrl = 'monicacrm';
    properties = [
        {
            displayName: 'Environment',
            name: 'environment',
            type: 'options',
            default: 'cloudHosted',
            options: [
                {
                    name: 'Cloud-Hosted',
                    value: 'cloudHosted',
                },
                {
                    name: 'Self-Hosted',
                    value: 'selfHosted',
                },
            ],
        },
        {
            displayName: 'Self-Hosted Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'https://www.mydomain.com',
            displayOptions: {
                show: {
                    environment: ['selfHosted'],
                },
            },
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=MonicaCrmApi.credentials.js.map