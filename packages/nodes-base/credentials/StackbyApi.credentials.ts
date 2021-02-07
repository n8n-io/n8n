import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class StackbyApi implements ICredentialType {
	name = 'stackbyApi';
	displayName = 'Stackby API';
	documentationUrl = 'stackby';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
