export class MessageBirdApi {
    name = 'messageBirdApi';
    displayName = 'MessageBird API';
    documentationUrl = 'messagebird';
    properties = [
        {
            displayName: 'API Key',
            name: 'accessKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=MessageBirdApi.credentials.js.map