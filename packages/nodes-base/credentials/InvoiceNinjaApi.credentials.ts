import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class InvoiceNinjaApi implements ICredentialType {
	name = 'invoiceNinjaApi';
	displayName = 'Invoice Ninja API';
	documentationUrl = 'invoiceNinja';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: 'https://app.invoiceninja.com',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
