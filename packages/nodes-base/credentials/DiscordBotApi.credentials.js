export class DiscordBotApi {
    name = 'discordBotApi';
    displayName = 'Discord Bot API';
    documentationUrl = 'discord';
    properties = [
        {
            displayName: 'Bot Token',
            name: 'botToken',
            type: 'string',
            default: '',
            required: true,
            typeOptions: {
                password: true,
            },
        },
        {
            displayName: 'Application ID',
            name: 'applicationId',
            type: 'string',
            default: '',
            description: 'Only needed when using Discord as an agent channel. Found on the application General Information page.',
        },
        {
            displayName: 'Public Key',
            name: 'publicKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'Only needed when using Discord as an agent channel. Used to verify Discord interaction signatures.',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bot {{$credentials.botToken}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://discord.com/api/v10/',
            url: '/users/@me/guilds',
        },
    };
}
//# sourceMappingURL=DiscordBotApi.credentials.js.map