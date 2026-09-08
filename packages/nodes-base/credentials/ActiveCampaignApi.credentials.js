export class ActiveCampaignApi {
    name = 'activeCampaignApi';
    displayName = 'ActiveCampaign API';
    documentationUrl = 'activecampaign';
    properties = [
        {
            displayName: 'API URL',
            name: 'apiUrl',
            type: 'string',
            default: '',
        },
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
                'Api-Token': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.apiUrl}}',
            url: '/api/3/fields',
        },
    };
}
//# sourceMappingURL=ActiveCampaignApi.credentials.js.map