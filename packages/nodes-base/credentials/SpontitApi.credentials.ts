import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SpontitApi implements ICredentialType {
	name = 'spontitApi';
	displayName = 'Spontit API';
	documentationUrl = 'spontit';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
