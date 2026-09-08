export class WorkableApi {
    name = 'workableApi';
    displayName = 'Workable API';
    documentationUrl = 'workable';
    properties = [
        {
            displayName: 'Subdomain',
            name: 'subdomain',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
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
            baseURL: '=https://{{$credentials.subdomain}}.workable.com/spi/v3',
            url: '/jobs',
        },
    };
}
//# sourceMappingURL=WorkableApi.credentials.js.map