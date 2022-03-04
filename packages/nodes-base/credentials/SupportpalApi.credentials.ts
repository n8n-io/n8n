import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SupportpalApi implements ICredentialType {
	name = 'supportpalApi';
	displayName = 'Supportpal API';
	documentationUrl = 'supportpal';
	properties: INodeProperties[] = [
		{
			displayName: 'Supportpal URL',
			name: 'supportpalUrl',
			type: 'string',
			placeholder: 'https://your_supportpal_url.com',
			default: '',
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
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
		},
	];
}
