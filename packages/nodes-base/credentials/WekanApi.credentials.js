export class WekanApi {
    name = 'wekanApi';
    displayName = 'Wekan API';
    documentationUrl = 'wekan';
    properties = [
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
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://wekan.yourdomain.com',
        },
        {
            displayName: 'Session Token',
            name: 'token',
            type: 'hidden',
            typeOptions: {
                expirable: true,
            },
            default: '',
        },
    ];
    async preAuthentication(credentials) {
        const url = credentials.url;
        const { token } = (await this.helpers.httpRequest({
            method: 'POST',
            url: `${url.endsWith('/') ? url.slice(0, -1) : url}/users/login`,
            body: {
                username: credentials.username,
                password: credentials.password,
            },
        }));
        return { token };
    }
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
            baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
            url: '/api/user',
        },
    };
}
//# sourceMappingURL=WekanApi.credentials.js.map