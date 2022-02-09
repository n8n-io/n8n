import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GristApi implements ICredentialType {
	name = 'gristApi';
	displayName = 'Grist API';
	documentationUrl = 'grist';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
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
					name: 'Self-hosted',
					value: 'self-hosted',
				},
			],
		},
		{
			displayName: 'Custom Instance',
			name: 'customUrl',
			type: 'string',
			default: '',
			required: true,
			description: "URL of your self-hosted grist, e.g. 'https://grist.your.org'",
			displayOptions: {
				show: {
					planType: [
						'self-hosted',
					],
				},
			},
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
					planType: [
						'paid',
					],
				},
			},
		},
	];
}
