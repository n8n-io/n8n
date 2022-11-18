import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SendyApi implements ICredentialType {
	name = 'sendyApi';
	displayName = 'Sendy API';
	documentationUrl = 'sendy';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://yourdomain.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
