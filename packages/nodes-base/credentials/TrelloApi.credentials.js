export class TrelloApi {
    name = 'trelloApi';
    displayName = 'Trello API';
    documentationUrl = 'trello';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
        {
            displayName: 'OAuth Secret',
            name: 'oauthSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Used to verify webhook authenticity. Found under the API Key tab at trello.com/power-ups/admin.',
        },
    ];
    async authenticate(credentials, requestOptions) {
        requestOptions.qs = {
            ...requestOptions.qs,
            key: credentials.apiKey,
            token: credentials.apiToken,
        };
        return requestOptions;
    }
    test = {
        request: {
            baseURL: 'https://api.trello.com',
            url: '=/1/tokens/{{$credentials.apiToken}}/member',
        },
    };
}
//# sourceMappingURL=TrelloApi.credentials.js.map