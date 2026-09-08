export class FacebookGraphAppApi {
    name = 'facebookGraphAppApi';
    displayName = 'Facebook Graph API (App)';
    documentationUrl = 'facebookapp';
    extends = ['facebookGraphApi'];
    properties = [
        {
            displayName: 'App Secret',
            name: 'appSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: '(Optional) When set, the node will sign API calls and verify incoming webhook payloads for added security',
        },
    ];
}
//# sourceMappingURL=FacebookGraphAppApi.credentials.js.map