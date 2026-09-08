export class BaserowTokenApi {
    name = 'baserowTokenApi';
    displayName = 'Baserow Token API';
    documentationUrl = 'baserow';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: 'https://api.baserow.io',
        },
        {
            displayName: 'Database Token',
            name: 'token',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
            description: 'In Baserow, click on top left corner, My settings, Database tokens, Create new.',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Token {{$credentials.token}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.host}}',
            url: '/api/database/tables/all-tables/',
        },
    };
}
//# sourceMappingURL=BaserowTokenApi.credentials.js.map