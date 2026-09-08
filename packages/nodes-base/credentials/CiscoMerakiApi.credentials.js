export class CiscoMerakiApi {
    name = 'ciscoMerakiApi';
    displayName = 'Cisco Meraki API';
    documentationUrl = 'ciscomeraki';
    icon = { light: 'file:icons/Cisco.svg', dark: 'file:icons/Cisco.dark.svg' };
    httpRequestNode = {
        name: 'Cisco Meraki',
        docsUrl: 'https://developer.cisco.com/meraki/api/',
        apiBaseUrl: 'https://api.meraki.com/api/v1/',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
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
                'X-Cisco-Meraki-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };
}
//# sourceMappingURL=CiscoMerakiApi.credentials.js.map