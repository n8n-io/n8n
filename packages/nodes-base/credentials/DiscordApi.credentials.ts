import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class DiscordApi implements ICredentialType {
	name = 'discordApi';
	displayName = 'Discord API';
	properties = [
		{
			displayName: 'Webhook URI',
			name: 'webhookUri',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
