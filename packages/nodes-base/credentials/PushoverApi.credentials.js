export class PushoverApi {
    name = 'pushoverApi';
    displayName = 'Pushover API';
    documentationUrl = 'pushover';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        if (requestOptions.method === 'GET' && requestOptions.qs) {
            Object.assign(requestOptions.qs, { token: credentials.apiKey });
        }
        else if (requestOptions.body) {
            Object.assign(requestOptions.body, { token: credentials.apiKey });
        }
        return requestOptions;
    }
    test = {
        request: {
            baseURL: 'https://api.pushover.net/1',
            url: '=/licenses.json?token={{$credentials?.apiKey}}',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=PushoverApi.credentials.js.map