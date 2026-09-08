export class UProcApi {
    name = 'uprocApi';
    displayName = 'uProc API';
    documentationUrl = 'uproc';
    properties = [
        {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            placeholder: 'name@email.com',
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
    async authenticate(credentials, requestOptions) {
        const token = Buffer.from(`${credentials.email}:${credentials.apiKey}`).toString('base64');
        requestOptions.headers = {
            ...requestOptions.headers,
            Authorization: `Basic ${token}`,
        };
        return requestOptions;
    }
    test = {
        request: {
            baseURL: 'https://api.uproc.io/api/v2',
            url: '/profile',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=UProcApi.credentials.js.map