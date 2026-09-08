export class NetscalerAdcApi {
    name = 'citrixAdcApi';
    displayName = 'Netscaler ADC API';
    documentationUrl = 'netscaleradc';
    properties = [
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            default: '',
            required: true,
            typeOptions: {
                password: true,
            },
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-NITRO-USER': '={{$credentials.username}}',
                'X-NITRO-PASS': '={{$credentials.password}}',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.url}}',
            url: '/nitro/v1/config/nspartition?view=summary',
        },
    };
}
//# sourceMappingURL=NetscalerAdcApi.credentials.js.map