export class HubspotAppToken {
    name = 'hubspotAppToken';
    displayName = 'HubSpot Service Key';
    documentationUrl = 'hubspot';
    properties = [
        {
            displayName: 'Service Key',
            name: 'appToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.appToken}}',
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
//# sourceMappingURL=HubspotAppToken.credentials.js.map