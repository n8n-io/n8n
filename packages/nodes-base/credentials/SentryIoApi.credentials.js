export class SentryIoApi {
    name = 'sentryIoApi';
    displayName = 'Sentry.io API';
    documentationUrl = 'sentryio';
    properties = [
        {
            displayName: 'Token',
            name: 'token',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.token}}',
            },
        },
    };
    test = {
        request: {
            method: 'GET',
            baseURL: 'https://sentry.io',
            url: '/api/0/organizations/',
        },
    };
}
//# sourceMappingURL=SentryIoApi.credentials.js.map