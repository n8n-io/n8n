import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class InvoiceNinjaServerApi implements ICredentialType {
	name = 'invoiceNinjaServerApi';
	displayName = 'Invoice Ninja API';
	properties = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
