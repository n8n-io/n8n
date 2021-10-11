import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZammadTokenApi implements ICredentialType {
	name = 'zammadTokenApi';
	displayName = 'Zammad Token API';
	documentationUrl = 'zammad';
	properties: INodeProperties[] = [
		{
			displayName: 'Zammad URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://your_url.zammad.com',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
