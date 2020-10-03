import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MindeeInvoiceApi implements ICredentialType {
	name = 'mindeeInvoiceApi';
	displayName = 'Mindee Invoice API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
