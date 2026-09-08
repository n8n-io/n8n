export class StrapiTokenApi {
    name = 'strapiTokenApi';
    displayName = 'Strapi API Token';
    documentationUrl = 'strapi';
    properties = [
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'https://api.example.com',
        },
        {
            displayName: 'API Version',
            name: 'apiVersion',
            default: 'v3',
            type: 'options',
            description: 'The version of api to be used',
            options: [
                {
                    name: 'Version 4',
                    value: 'v4',
                    description: 'API version supported by Strapi 4',
                },
                {
                    name: 'Version 3',
                    value: 'v3',
                    description: 'API version supported by Strapi 3',
                },
            ],
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url}}',
            url: '={{$credentials.apiVersion === "v3" ? "/users/count" : "/api/users/count"}}',
            ignoreHttpStatusErrors: true,
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'error.name',
                    value: 'UnauthorizedError',
                    message: 'Invalid API token',
                },
            },
        ],
    };
}
//# sourceMappingURL=StrapiTokenApi.credentials.js.map