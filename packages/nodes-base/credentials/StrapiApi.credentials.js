export class StrapiApi {
    name = 'strapiApi';
    displayName = 'Strapi API';
    documentationUrl = 'strapi';
    properties = [
        {
            displayName: 'Make sure you are using a user account not an admin account',
            name: 'notice',
            type: 'notice',
            default: '',
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
}
//# sourceMappingURL=StrapiApi.credentials.js.map