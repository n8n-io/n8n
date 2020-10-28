import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SendyApi implements ICredentialType {
	name = 'sendyApi';
	displayName = 'Sendy API';
	documentationUrl = 'sendy';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://yourdomain.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
