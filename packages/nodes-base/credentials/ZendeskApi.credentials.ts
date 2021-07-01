import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZendeskApi implements ICredentialType {
	name = 'zendeskApi';
	displayName = 'Zendesk API';
	documentationUrl = 'zendesk';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			description: 'The subdomain of your Zendesk work environment.',
			placeholder: 'company',
			default: '',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];
}
