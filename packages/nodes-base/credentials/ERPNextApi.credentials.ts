import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ERPNextApi implements ICredentialType {
	name = 'erpNextApi';
	displayName = 'ERPNext API';
	documentationUrl = 'erpnext';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
		},
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
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			placeholder: 'n8n',
			description: 'Subdomain of cloud-hosted ERPNext instance. For example, "n8n" is the subdomain in: <code>https://n8n.erpnext.com</code>',
			displayOptions: {
				show: {
					environment: [
						'cloudHosted',
					],
				},
			},
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://www.mydomain.com',
			description: 'Fully qualified domain name of self-hosted ERPNext instance.',
			displayOptions: {
				show: {
					environment: [
						'selfHosted',
					],
				},
			},
		},
	];
}
