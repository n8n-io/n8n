import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ERPNextApi implements ICredentialType {
	name = 'erpNextApi';
	displayName = 'ERPNext API';
	documentationUrl = 'erpnext';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options' as NodePropertyTypes,
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
			type: 'string' as NodePropertyTypes,
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
			type: 'string' as NodePropertyTypes,
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
