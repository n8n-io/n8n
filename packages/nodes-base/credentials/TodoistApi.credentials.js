export class TodoistApi {
    name = 'todoistApi';
    displayName = 'Todoist API';
    documentationUrl = 'todoist';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.todoist.com/api/v1',
            url: '/labels',
        },
    };
}
//# sourceMappingURL=TodoistApi.credentials.js.map