export class LemlistApi {
    name = 'lemlistApi';
    displayName = 'Lemlist API';
    documentationUrl = 'lemlist';
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
        const encodedApiKey = Buffer.from(':' + credentials.apiKey).toString('base64');
        requestOptions.headers.Authorization = `Basic ${encodedApiKey}`;
        requestOptions.headers['user-agent'] = 'n8n';
        return requestOptions;
    }
    test = {
        request: {
            baseURL: 'https://api.lemlist.com/api',
            url: '/campaigns',
        },
    };
}
//# sourceMappingURL=LemlistApi.credentials.js.map