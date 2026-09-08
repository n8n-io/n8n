export class MondayComApi {
    name = 'mondayComApi';
    displayName = 'Monday.com API';
    documentationUrl = 'mondaycom';
    properties = [
        {
            displayName: 'Token V2',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
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
            headers: {
                'API-Version': '2023-10',
                'Content-Type': 'application/json',
            },
            baseURL: 'https://api.monday.com/v2',
            method: 'POST',
            body: JSON.stringify({
                query: 'query { me { name }}',
            }),
        },
    };
}
//# sourceMappingURL=MondayComApi.credentials.js.map