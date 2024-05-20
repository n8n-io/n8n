/**
 * Credential type test data
 */
import type { ICredentialType } from 'n8n-workflow';

export const newCredentialType = (name: string): ICredentialType => ({
	name,
	displayName: name,
	documentationUrl: name,
	properties: [],
});

export const credentialTypeTelegram = {
	name: 'telegramApi',
	displayName: 'Telegram API',
	documentationUrl: 'telegram',
	properties: [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'Chat with the <a href="https://telegram.me/botfather">bot father</a> to obtain the access token',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.telegram.org',
			description: 'Base URL for Telegram Bot API',
		},
	],
	test: {
		request: {
			baseURL: '={{$credentials.baseUrl}}/bot{{$credentials.accessToken}}',
			url: '/getMe',
		},
	},
} satisfies ICredentialType;
