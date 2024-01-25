import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class TelegramApi implements ICredentialType {
	name = 'telegramApi';

	displayName = 'Telegram API';

	documentationUrl = 'telegram';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.telegram.org',
			description:
				'Base URL for Telegram Bot API',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Chat with the <a href="https://telegram.me/botfather">bot father</a> to obtain the access token',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}{{$credentials.accessToken}}',
			url: '/getMe',
		},
	};
}
