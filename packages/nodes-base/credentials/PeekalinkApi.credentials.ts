import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PeekalinkApi implements ICredentialType {
	name = 'peekalinkApi';
	displayName = 'Peekalink API';
	documentationUrl = 'peekalink';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
