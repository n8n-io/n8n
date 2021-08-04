import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MindeeInvoiceApi implements ICredentialType {
	name = 'mindeeInvoiceApi';
	displayName = 'Mindee Invoice API';
	documentationUrl = 'mindee';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
