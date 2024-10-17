import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'offline_access',
	'read:jira-user',
	'read:jira-work',
	'write:jira-work',
	'manage:jira-webhook',
	'manage:jira-project',
	'manage:jira-configuration',
	// 'manage:jira-data-provider',
	// 'read:servicedesk-request',
	// 'manage:servicedesk-customer',
	// 'write:servicedesk-request',
	// 'read:servicemanagement-insight-objects',
];

export class JiraSoftwareCloudOAuth2Api implements ICredentialType {
	name = 'jiraSoftwareCloudOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Jira SW Cloud OAuth2 API';

	documentationUrl = 'jira';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.atlassian.com/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.atlassian.com/oauth/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'audience=api.atlassian.com',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'response_type=code',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			// type: 'hidden',
			type: 'string',
			default: scopes.join(' '),
		},
	];
}
