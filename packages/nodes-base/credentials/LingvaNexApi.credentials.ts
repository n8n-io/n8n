import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class LingvaNexApi implements ICredentialType {
	name = 'lingvaNexApi';
	displayName = 'LingvaNex API';
	documentationUrl = 'lingvaNex';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
