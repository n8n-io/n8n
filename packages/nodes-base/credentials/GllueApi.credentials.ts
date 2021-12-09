import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class GllueApi implements ICredentialType {
	name = 'gllueApi';
	displayName = 'Gllue API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
