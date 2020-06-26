import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ZendeskApi implements ICredentialType {
	name = 'zendeskApi';
	displayName = 'Zendesk API';
	properties = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string' as NodePropertyTypes,
			description: 'The subdomain of your Zendesk work environment.',
			default: 'n8n',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
