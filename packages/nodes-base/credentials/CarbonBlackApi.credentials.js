export class CarbonBlackApi {
    name = 'carbonBlackApi';
    displayName = 'Carbon Black API';
    icon = { light: 'file:icons/vmware.svg', dark: 'file:icons/vmware.dark.svg' };
    documentationUrl = 'carbonblack';
    httpRequestNode = {
        name: 'Carbon Black',
        docsUrl: 'https://developer.carbonblack.com/reference',
        apiBaseUrl: '',
    };
    properties = [
        {
            displayName: 'URL',
            name: 'apiUrl',
            type: 'string',
            placeholder: 'https://defense.conferdeploy.net/',
            default: '',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-Auth-Token': '={{$credentials.accessToken}}',
            },
        },
    };
}
//# sourceMappingURL=CarbonBlackApi.credentials.js.map