export class JiraSoftwareServerApi {
    name = 'jiraSoftwareServerApi';
    displayName = 'Jira SW Server API';
    documentationUrl = 'jira';
    properties = [
        {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            placeholder: 'name@email.com',
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            typeOptions: {
                password: true,
            },
            type: 'string',
            default: '',
        },
        {
            displayName: 'Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'https://example.com',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.email}}',
                password: '={{$credentials.password}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.domain?.replace(/\\/+$/, "")}}',
            url: '/rest/api/2/myself',
        },
    };
}
//# sourceMappingURL=JiraSoftwareServerApi.credentials.js.map