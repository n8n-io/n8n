import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DiscordBotApi implements ICredentialType {
	name = 'discordBotApi';

	displayName = 'Discord Bot API';

	documentationUrl = 'discord';

	properties: INodeProperties[] = [
		{
			displayName: 'Bot Token',
			name: 'botToken',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
