import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GristApi implements ICredentialType {
	name = 'gristApi';
	displayName = 'Grist API';
	documentationUrl = 'grist';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Plan Type',
			name: 'planType',
			type: 'options',
			default: 'free',
			options: [
				{
					name: 'Free',
					value: 'free',
				},
				{
					name: 'Paid',
					value: 'paid',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Custom Subdomain',
			name: 'customSubdomain',
			type: 'string',
			default: '',
			required: true,
			description: 'Custom subdomain of your team',
			displayOptions: {
				show: {
					planType: ['paid'],
				},
			},
		},
		{
			displayName: 'Self-Hosted URL',
			name: 'selfHostedUrl',
			type: 'string',
			default: '',
			placeholder: 'http://localhost:8484',
			required: true,
			description:
				'URL of your Grist instance. Include http/https without /api and no trailing slash.',
			displayOptions: {
				show: {
					planType: ['selfHosted'],
				},
			},
		},
	];
}
