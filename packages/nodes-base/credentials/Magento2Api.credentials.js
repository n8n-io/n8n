export class Magento2Api {
    name = 'magento2Api';
    displayName = 'Magento 2 API';
    documentationUrl = 'magento2';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
    test = {
        request: {
            baseURL: '={{$credentials.host}}',
            url: '/rest/default/V1/modules',
        },
    };
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.accessToken}}',
            },
        },
    };
}
//# sourceMappingURL=Magento2Api.credentials.js.map