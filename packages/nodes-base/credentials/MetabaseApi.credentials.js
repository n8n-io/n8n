export class MetabaseApi {
    name = 'metabaseApi';
    displayName = 'Metabase API';
    documentationUrl = 'metabase';
    properties = [
        {
            displayName: 'Session Token',
            name: 'sessionToken',
            type: 'hidden',
            typeOptions: {
                expirable: true,
            },
            default: '',
        },
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
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
    // method will only be called if "sessionToken" (the expirable property)
    // is empty or is expired
    async preAuthentication(credentials) {
        // make reques to get session token
        const url = credentials.url;
        const { id } = (await this.helpers.httpRequest({
            method: 'POST',
            url: `${url.endsWith('/') ? url.slice(0, -1) : url}/api/session`,
            body: {
                username: credentials.username,
                password: credentials.password,
            },
        }));
        return { sessionToken: id };
    }
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Metabase-Session': '={{$credentials.sessionToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials?.url}}',
            url: '/api/user/current',
        },
    };
}
//# sourceMappingURL=MetabaseApi.credentials.js.map