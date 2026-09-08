export class OpenAiApi {
    name = 'openAiApi';
    displayName = 'OpenAI';
    documentationUrl = 'openai';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
        {
            displayName: 'Organization ID (optional)',
            name: 'organizationId',
            type: 'string',
            default: '',
            hint: 'Only required if you belong to multiple organisations',
            description: "For users who belong to multiple organizations, you can set which organization is used for an API request. Usage from these API requests will count against the specified organization's subscription quota.",
        },
        {
            displayName: 'Base URL',
            name: 'url',
            type: 'string',
            default: 'https://api.openai.com/v1',
            description: 'Override the default base URL for the API',
        },
        {
            displayName: 'Add Custom Header',
            name: 'header',
            type: 'boolean',
            default: false,
        },
        {
            displayName: 'Header Name',
            name: 'headerName',
            type: 'string',
            typeOptions: {
                ignoreCredentialExpressionResolveError: true,
            },
            displayOptions: {
                show: {
                    header: [true],
                },
            },
            default: '',
        },
        {
            displayName: 'Header Value',
            name: 'headerValue',
            type: 'string',
            typeOptions: {
                ignoreCredentialExpressionResolveError: true,
                password: true,
            },
            displayOptions: {
                show: {
                    header: [true],
                },
            },
            default: '',
        },
    ];
    test = {
        request: {
            baseURL: '={{$credentials?.url}}',
            url: '/models',
        },
    };
    async authenticate(credentials, requestOptions) {
        requestOptions.headers ??= {};
        requestOptions.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        requestOptions.headers['OpenAI-Organization'] = credentials.organizationId;
        if (credentials.header &&
            typeof credentials.headerName === 'string' &&
            credentials.headerName &&
            typeof credentials.headerValue === 'string') {
            requestOptions.headers[credentials.headerName] = credentials.headerValue;
        }
        return requestOptions;
    }
}
//# sourceMappingURL=OpenAiApi.credentials.js.map