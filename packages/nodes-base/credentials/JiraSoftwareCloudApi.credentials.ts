import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class JiraSoftwareCloudApi implements ICredentialType {
	name = 'jiraSoftwareCloudApi';
	displayName = 'Jira SW Cloud API';
	documentationUrl = 'jira';
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
			placeholder: 'https://example.atlassian.net',
		},
	];
}
