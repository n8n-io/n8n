import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MonicaCrmApi implements ICredentialType {
	name = 'monicaCrmApi';
	displayName = 'Monica CRM API';
	documentationUrl = 'monicaCrm';
	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-hosted domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://www.mydomain.com',
			displayOptions: {
				show: {
					environment: [
						'selfHosted',
					],
				},
			},
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];
}
