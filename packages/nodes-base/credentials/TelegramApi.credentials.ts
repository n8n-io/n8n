import {
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
			description: 'Chat with the <a href="https://telegram.me/botfather">bot father</a> to obtain the access token.',
		},
		{
			displayName: 'Advanced',
			name: 'advanced',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'API Endpoint',
			name: 'apiEndpoint',
			type: 'string',
			displayOptions: {
				show: {
					advanced: [
						true,
					],
				},
			},
			default: 'https://api.telegram.org/bot{0}/{1}',
			description: 'API endpoint. Use to redirect Telegram API calls to another server. First \'{0}\' is the \'accessToken\', second \'{1}\' is the endpoint method. See: <a href="https://core.telegram.org/bots">bot api</a>.',
		},
		{
			displayName: 'File Endpoint',
			name: 'fileEndpoint',
			type: 'string',
			displayOptions: {
				show: {
					advanced: [
						true,
					],
				},
			},
			default: 'https://api.telegram.org/file/bot{0}/{1}',
			description: 'File endpoint. Use to redirect Telegram File API calls to another server. First \'{0}\' is the \'accessToken\', second \'{1}\' is the endpoint method. See: <a href="https://core.telegram.org/bots">bot api</a>.',
		},
	];
}
