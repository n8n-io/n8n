export class JiraSoftwareServerPatApi {
    name = 'jiraSoftwareServerPatApi';
    displayName = 'Jira SW Server (PAT) API';
    documentationUrl = 'jira';
    properties = [
        {
            displayName: 'Personal Access Token',
            name: 'personalAccessToken',
            typeOptions: { password: true },
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
            headers: {
                Authorization: '=Bearer {{$credentials.personalAccessToken}}',
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
//# sourceMappingURL=JiraSoftwareServerPatApi.credentials.js.map