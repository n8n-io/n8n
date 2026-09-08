export class FlowApi {
    name = 'flowApi';
    displayName = 'Flow API';
    documentationUrl = 'flow';
    properties = [
        {
            displayName: 'Organization ID',
            name: 'organizationId',
            type: 'number',
            default: 0,
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=FlowApi.credentials.js.map