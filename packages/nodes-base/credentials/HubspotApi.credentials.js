export class HubspotApi {
    name = 'hubspotApi';
    displayName = 'HubSpot API';
    documentationUrl = 'hubspot';
    properties = [
        {
            displayName: 'On 30 November, 2022 Hubspot will remove API key support. You will have to connect to HubSpot using private app or Oauth2 auth method. <a target="_blank" href="https://developers.hubspot.com/changelog/upcoming-api-key-sunset">More details (HubSpot.com)</a>',
            name: 'notice',
            type: 'notice',
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
            qs: {
                hapikey: '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.hubapi.com',
            url: '/account-info/v3/details',
        },
    };
}
//# sourceMappingURL=HubspotApi.credentials.js.map