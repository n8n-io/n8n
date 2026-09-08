export class SysdigApi {
    name = 'sysdigApi';
    displayName = 'Sysdig API';
    documentationUrl = 'sysdig';
    icon = { light: 'file:icons/Sysdig.Black.svg', dark: 'file:icons/Sysdig.White.svg' };
    httpRequestNode = {
        name: 'Sysdig',
        docsUrl: 'https://docs.sysdig.com/en/docs/developer-tools/sysdig-api/',
        apiBaseUrl: 'https://app.us1.sysdig.com',
    };
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
}
//# sourceMappingURL=SysdigApi.credentials.js.map