export class KoBoToolboxApi {
    name = 'koBoToolboxApi';
    displayName = 'KoBoToolbox API Token';
    // See https://support.kobotoolbox.org/api.html
    documentationUrl = 'kobotoolbox';
    properties = [
        {
            displayName: 'API Root URL',
            name: 'URL',
            type: 'string',
            default: 'https://kf.kobotoolbox.org/',
        },
        {
            displayName: 'API Token',
            name: 'token',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            hint: 'You can get your API token at https://[api-root]/token/?format=json (for a logged in user)',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Token {{$credentials.token}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.URL}}',
            url: '/api/v2/assets/',
            method: 'GET',
        },
    };
}
//# sourceMappingURL=KoBoToolboxApi.credentials.js.map