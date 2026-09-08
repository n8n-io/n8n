export class WebflowApi {
    name = 'webflowApi';
    displayName = 'Webflow API';
    documentationUrl = 'webflow';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.webflow.com',
            url: '/v2/sites',
        },
    };
}
//# sourceMappingURL=WebflowApi.credentials.js.map