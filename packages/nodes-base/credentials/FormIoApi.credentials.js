export class FormIoApi {
    name = 'formIoApi';
    displayName = 'Form.io API';
    documentationUrl = 'formiotrigger';
    properties = [
        {
            displayName: 'Environment',
            name: 'environment',
            type: 'options',
            default: 'cloudHosted',
            options: [
                {
                    name: 'Cloud-Hosted',
                    value: 'cloudHosted',
                },
                {
                    name: 'Self-Hosted',
                    value: 'selfHosted',
                },
            ],
        },
        {
            displayName: 'Self-Hosted Domain',
            name: 'domain',
            type: 'string',
            default: '',
            placeholder: 'https://www.mydomain.com',
            displayOptions: {
                show: {
                    environment: ['selfHosted'],
                },
            },
        },
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
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
        },
        {
            displayName: 'Token',
            name: 'token',
            type: 'hidden',
            typeOptions: {
                expirable: true,
                password: true,
            },
            default: '',
        },
    ];
    async preAuthentication(credentials) {
        const base = credentials.domain || 'https://formio.form.io';
        const options = {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: {
                data: {
                    email: credentials.email,
                    password: credentials.password,
                },
            },
            url: `${base}/user/login`,
            json: true,
            returnFullResponse: true,
        };
        const responseObject = await this.helpers.httpRequest(options);
        const token = responseObject.headers['x-jwt-token'];
        return { token };
    }
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'x-jwt-token': '={{ $credentials.token }}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.domain || "https://formio.form.io"}}',
            url: 'current',
        },
    };
}
//# sourceMappingURL=FormIoApi.credentials.js.map