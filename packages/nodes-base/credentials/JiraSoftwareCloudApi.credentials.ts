import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class JiraSoftwareCloudApi implements ICredentialType {
	name = 'jiraSoftwareCloudApi';
	displayName = 'Jira SW API';
	properties = [
		{
			displayName: 'Jira Version',
			name: 'jiraVersion',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'Cloud',
					value: 'cloud',
				},
				{
					name: 'Server (Self Hosted)',
					value: 'server',
				},
			],
			default: 'cloud',
		},
		{
			displayName: 'Email',
			name: 'email',
			displayOptions: {
				show: {
					jiraVersion: [
						'cloud',
					],
				},
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			displayOptions: {
				show: {
					jiraVersion: [
						'cloud',
					],
				},
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			displayOptions: {
				show: {
					jiraVersion: [
						'server',
					],
				},
			},
			typeOptions: {
				password: true,
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			displayOptions: {
				show: {
					jiraVersion: [
						'cloud',
						'server',
					],
				},
			},
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
