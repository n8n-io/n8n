import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ZendeskApi implements ICredentialType {
	name = 'zendeskApi';
	displayName = 'Zendesk API';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
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
