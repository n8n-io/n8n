import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class EmeliaApi implements ICredentialType {
	name = 'emeliaApi';
	displayName = 'Emelia API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
