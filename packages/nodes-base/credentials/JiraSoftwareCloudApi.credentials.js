export class JiraSoftwareCloudApi {
    name = 'jiraSoftwareCloudApi';
    displayName = 'Jira SW Cloud API';
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
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'https://example.atlassian.net',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.email}}',
                password: '={{$credentials.apiToken}}',
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
//# sourceMappingURL=JiraSoftwareCloudApi.credentials.js.map