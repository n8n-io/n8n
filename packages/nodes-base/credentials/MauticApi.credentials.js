export class MauticApi {
    name = 'mauticApi';
    displayName = 'Mautic API';
    documentationUrl = 'mautic';
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://name.mautic.net',
        },
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.username}}',
                password: '={{$credentials.password}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
            url: '/api/users/self',
        },
    };
}
//# sourceMappingURL=MauticApi.credentials.js.map