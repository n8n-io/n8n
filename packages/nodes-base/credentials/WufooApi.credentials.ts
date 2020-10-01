import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WufooApi implements ICredentialType {
	name = 'wufooApi';
	displayName = 'Wufoo API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
