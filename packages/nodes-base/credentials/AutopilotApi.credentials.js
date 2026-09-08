export class AutopilotApi {
    name = 'autopilotApi';
    displayName = 'Autopilot API';
    documentationUrl = 'autopilot';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=AutopilotApi.credentials.js.map