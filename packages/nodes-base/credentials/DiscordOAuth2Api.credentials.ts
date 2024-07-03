import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DiscordOAuth2Api implements ICredentialType {
	name = 'discordOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Discord OAuth2 API';

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
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://discord.com/api/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://discord.com/api/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'identify guilds guilds.join bot',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'permissions=1642758929655',
		},
	];
}
