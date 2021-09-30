import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SeaTableApi implements ICredentialType {
	name = 'seaTableApi';
	displayName = 'SeaTable API';
	documentationUrl = 'seaTable';
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
			displayName: 'API Token (of a Base)',
			name: 'token',
			type: 'string',
			default: '',
		},
	];
}
