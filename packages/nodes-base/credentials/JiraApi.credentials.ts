import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class JiraApi implements ICredentialType {
	name = 'jiraApi';
	displayName = 'Jira API';
	properties = [
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
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
