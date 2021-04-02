import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class DeepLApi implements ICredentialType {
	name = 'deepLApi';
	displayName = 'DeepL API';
	documentationUrl = 'deepL';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
