import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SpontitApi implements ICredentialType {
	name = 'spontitApi';
	displayName = 'Spontit API';
	documentationUrl = 'https://api.spontit.com/';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Your User ID',
			name: 'userId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
