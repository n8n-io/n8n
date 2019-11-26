import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class JiraApi implements ICredentialType {
	name = 'jiraApi';
	displayName = 'Jira API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
