export class ActionNetworkApi {
    name = 'actionNetworkApi';
    displayName = 'Action Network API';
    documentationUrl = 'actionnetwork';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    test = {
        request: {
            baseURL: 'https://actionnetwork.org/api/v2',
            url: '/events?per_page=1',
        },
    };
    async authenticate(credentials, requestOptions) {
        requestOptions.headers = { 'OSDI-API-Token': credentials.apiKey };
        return requestOptions;
    }
}
//# sourceMappingURL=ActionNetworkApi.credentials.js.map