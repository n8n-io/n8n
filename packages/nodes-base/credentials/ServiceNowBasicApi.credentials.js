export class ServiceNowBasicApi {
    name = 'serviceNowBasicApi';
    extends = ['httpBasicAuth'];
    displayName = 'ServiceNow Basic Auth API';
    documentationUrl = 'servicenow';
    properties = [
        {
            displayName: 'User',
            name: 'user',
            type: 'string',
            required: true,
            default: '',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            required: true,
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Subdomain',
            name: 'subdomain',
            type: 'string',
            default: '',
            hint: 'The subdomain can be extracted from the URL. If the URL is: https://dev99890.service-now.com the subdomain is dev99890',
            required: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            auth: {
                username: '={{$credentials.user}}',
                password: '={{$credentials.password}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '=https://{{$credentials?.subdomain}}.service-now.com',
            url: '/api/now/table/sys_user_role',
        },
    };
}
//# sourceMappingURL=ServiceNowBasicApi.credentials.js.map