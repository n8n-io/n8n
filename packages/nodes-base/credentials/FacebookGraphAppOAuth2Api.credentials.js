export class FacebookGraphAppOAuth2Api {
    name = 'facebookGraphAppOAuth2Api';
    displayName = 'Facebook Graph (App) OAuth2 API';
    extends = ['facebookGraphApiOAuth2Api'];
    documentationUrl = 'facebookapp';
    properties = [
        {
            displayName: 'App Secret',
            name: 'appSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: '(Optional) When set, the node will verify incoming webhook payloads for added security',
        },
    ];
}
//# sourceMappingURL=FacebookGraphAppOAuth2Api.credentials.js.map