import { BASE_URL } from '../nodes/Airtop/constants';
export class AirtopApi {
    name = 'airtopApi';
    displayName = 'Airtop API';
    documentationUrl = 'airtop';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            default: '',
            description: 'The Airtop API key. You can create one at <a href="https://portal.airtop.ai/api-keys" target="_blank">Airtop</a> for free.',
            required: true,
            typeOptions: {
                password: true,
            },
            noDataExpression: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
                'api-key': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            method: 'GET',
            baseURL: BASE_URL,
            url: '/sessions',
            qs: {
                limit: 10,
            },
        },
    };
}
//# sourceMappingURL=AirtopApi.credentials.js.map