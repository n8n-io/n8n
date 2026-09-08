export class BambooHrApi {
    name = 'bambooHrApi';
    displayName = 'BambooHR API';
    documentationUrl = 'bamboohr';
    properties = [
        {
            displayName: 'Subdomain',
            name: 'subdomain',
            type: 'string',
            default: '',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=BambooHrApi.credentials.js.map