import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MindeeReceiptApi implements ICredentialType {
	name = 'mindeeReceiptApi';
	displayName = 'Mindee Receipt API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
