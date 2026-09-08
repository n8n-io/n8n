export class TwakeCloudApi {
    name = 'twakeCloudApi';
    displayName = 'Twake Cloud API';
    documentationUrl = 'twake';
    properties = [
        {
            displayName: 'Workspace Key',
            name: 'workspaceKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.workspaceKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://plugins.twake.app/plugins/n8n',
            url: '/channel',
            method: 'POST',
        },
    };
}
//# sourceMappingURL=TwakeCloudApi.credentials.js.map