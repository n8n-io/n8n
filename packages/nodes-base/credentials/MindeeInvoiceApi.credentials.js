export class MindeeInvoiceApi {
    name = 'mindeeInvoiceApi';
    displayName = 'Mindee Invoice API';
    documentationUrl = 'mindee';
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
        // @ts-ignore
        const url = new URL(requestOptions.url ? requestOptions.url : requestOptions.uri);
        if (url.hostname === 'api.mindee.net' && url.pathname.startsWith('/v1/')) {
            requestOptions.headers.Authorization = `Token ${credentials.apiKey}`;
        }
        else {
            requestOptions.headers['X-Inferuser-Token'] = `${credentials.apiKey}`;
        }
        return requestOptions;
    }
}
//# sourceMappingURL=MindeeInvoiceApi.credentials.js.map