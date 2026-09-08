export class NpmApi {
    name = 'npmApi';
    displayName = 'Npm API';
    documentationUrl = 'npm';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Registry Url',
            name: 'registryUrl',
            type: 'string',
            default: 'https://registry.npmjs.org',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.registryUrl}}',
            url: '/-/whoami',
        },
    };
}
//# sourceMappingURL=NpmApi.credentials.js.map