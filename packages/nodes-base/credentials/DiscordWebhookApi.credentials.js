export class DiscordWebhookApi {
    name = 'discordWebhookApi';
    displayName = 'Discord Webhook';
    documentationUrl = 'discord';
    properties = [
        {
            displayName: 'Webhook URL',
            name: 'webhookUri',
            type: 'string',
            required: true,
            default: '',
            placeholder: 'https://discord.com/api/webhooks/ID/TOKEN',
            typeOptions: {
                password: true,
            },
        },
    ];
    test = {
        request: {
            baseURL: '={{ $credentials.webhookUri }}',
        },
    };
}
//# sourceMappingURL=DiscordWebhookApi.credentials.js.map