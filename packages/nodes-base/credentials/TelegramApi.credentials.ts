import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class TelegramApi implements ICredentialType {
	name = 'telegramApi';
	displayName = 'Telegram API';
	documentationUrl = 'telegram';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			description: 'Chat with the <a href="https://telegram.me/botfather">bot father</a> to obtain the access token',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.telegram.org/bot{{$credentials.accessToken}}',
			url: '/getMe',
		},
	};
}
