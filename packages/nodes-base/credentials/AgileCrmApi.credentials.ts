import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AgileCrmApi implements ICredentialType {
	name = 'agileCrmApi';
	displayName = 'AgileCRM API';
	documentationUrl = 'agileCrm';
	properties = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
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
			placeholder: 'example',
			description: 'If the domain is https://example.agilecrm.com "example" would have to be entered.',
		},
	];
}
