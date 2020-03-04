import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class InvoiceNinjaCloudApi implements ICredentialType {
	name = 'invoiceNinjaCloudApi';
	displayName = 'Invoice Ninja API';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
