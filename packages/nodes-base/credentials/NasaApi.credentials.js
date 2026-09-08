export class NasaApi {
    name = 'nasaApi';
    displayName = 'NASA API';
    documentationUrl = 'nasa';
    properties = [
        {
            displayName: 'API Key',
            name: 'api_key',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            qs: {
                api_key: '={{$credentials.api_key}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.nasa.gov',
            url: '/planetary/apod',
        },
    };
}
//# sourceMappingURL=NasaApi.credentials.js.map