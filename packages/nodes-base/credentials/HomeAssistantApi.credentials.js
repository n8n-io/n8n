export class HomeAssistantApi {
    name = 'homeAssistantApi';
    displayName = 'Home Assistant API';
    documentationUrl = 'homeassistant';
    properties = [
        {
            displayName: 'Host',
            name: 'host',
            type: 'string',
            default: '',
        },
        {
            displayName: 'Port',
            name: 'port',
            type: 'number',
            default: 8123,
        },
        {
            displayName: 'SSL',
            name: 'ssl',
            type: 'boolean',
            default: false,
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
//# sourceMappingURL=HomeAssistantApi.credentials.js.map