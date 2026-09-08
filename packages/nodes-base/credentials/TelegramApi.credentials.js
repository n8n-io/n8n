export class TelegramApi {
    name = 'telegramApi';
    displayName = 'Telegram API';
    documentationUrl = 'telegram';
    properties = [
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            description: 'Chat with the <a href="https://telegram.me/botfather">bot father</a> to obtain the access token',
        },
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'https://api.telegram.org',
            description: 'Base URL for Telegram Bot API',
        },
    ];
    test = {
        request: {
            baseURL: '={{$credentials.baseUrl}}/bot{{$credentials.accessToken}}',
            url: '/getMe',
        },
    };
}
//# sourceMappingURL=TelegramApi.credentials.js.map