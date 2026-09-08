export class Signl4Api {
    name = 'signl4Api';
    displayName = 'SIGNL4 Webhook';
    documentationUrl = 'signl4';
    properties = [
        {
            displayName: 'Team Secret',
            name: 'teamSecret',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'The team secret is the last part of your SIGNL4 webhook URL',
        },
    ];
}
//# sourceMappingURL=Signl4Api.credentials.js.map