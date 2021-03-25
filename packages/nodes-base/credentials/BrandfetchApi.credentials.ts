import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class BrandfetchApi implements ICredentialType {
	name = 'brandfetchApi';
	displayName = 'Brandfetch API';
	documentationUrl = 'brandfetch';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
