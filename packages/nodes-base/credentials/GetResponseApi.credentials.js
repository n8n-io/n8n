export class GetResponseApi {
    name = 'getResponseApi';
    displayName = 'GetResponse API';
    documentationUrl = 'getresponse';
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
                'X-Auth-Token': '=api-key {{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.getresponse.com/v3',
            url: '/campaigns',
        },
    };
}
//# sourceMappingURL=GetResponseApi.credentials.js.map