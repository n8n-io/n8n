import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MindeeReceiptApi implements ICredentialType {
	name = 'mindeeReceiptApi';
	displayName = 'Mindee Receipt API';
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
