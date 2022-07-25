import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class InvoiceNinjaApi implements ICredentialType {
	name = 'invoiceNinjaApi';
	displayName = 'Invoice Ninja API';
	documentationUrl = 'invoiceNinja';
	properties: INodeProperties[] = [
		{
			displayName: 'Version',
			name: 'version',
			type: 'options',
			default: 'v4',
			options: [
				{
					name: 'v4',
					value: 'v4',
				},
				{
					name: 'v5',
					value: 'v5',
				},
			],
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			hint: 'Default URL for v4 is https://app.invoiceninja.com, for v5 it is https://invoicing.co',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			default: '',
			hint: 'This is optional, enter only if you did set a secret in your app',
			displayOptions: {
				show: {
					version: [
						'v5',
					],
				},
			},
		},
	];
}
