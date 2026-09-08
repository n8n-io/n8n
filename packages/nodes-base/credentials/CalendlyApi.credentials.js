export class CalendlyApi {
    name = 'calendlyApi';
    displayName = 'Calendly Personal Access Token API';
    documentationUrl = 'calendly';
    properties = [
        {
            displayName: 'Personal Access Token',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    async authenticate(credentials, requestOptions) {
        const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey : '';
        requestOptions.headers = requestOptions.headers ?? {};
        requestOptions.headers.Authorization = `Bearer ${apiKey}`;
        return requestOptions;
    }
    test = {
        request: {
            baseURL: 'https://api.calendly.com',
            url: '/users/me',
        },
    };
}
//# sourceMappingURL=CalendlyApi.credentials.js.map