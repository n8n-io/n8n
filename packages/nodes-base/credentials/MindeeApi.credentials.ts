import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MindeeApi implements ICredentialType {
	name = 'mindeeApi';
	displayName = 'Mindee API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
