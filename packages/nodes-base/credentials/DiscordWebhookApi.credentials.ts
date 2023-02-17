import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DiscordWebhookApi implements ICredentialType {
	name = 'discordWebhookApi';

	displayName = 'Discord Webhook';

	documentationUrl = 'discord';

	properties: INodeProperties[] = [
		{
			displayName:
				'Follow instrucitons of how to add webhook to a channel on <a href="https://docs.n8n.io/integrations/builtin/credentials/discord/#creating-a-webhook-in-discord" target="_blank">this page</a>. <br/>Keep in mind that only <strong>Webhook</strong> resource would be available when this authentication method is used.  <br/>To have access to other resources please use <strong>OAuth2</strong> authentication',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Use Webhook',
			name: 'useWebhook',
			type: 'boolean',
			default: false,
			required: true,
		},
	];
}
