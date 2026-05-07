import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = [
	'read:jira-user',
	'read:jira-work',
	'write:jira-work',
	'manage:jira-webhook',
	'manage:jira-user',
	'offline_access',
];

export class JiraSoftwareCloudOAuth2Api implements ICredentialType {
	name = 'jiraSoftwareCloudOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Jira SW Cloud OAuth2 API';

	documentationUrl = 'jira';

	properties: INodeProperties[] = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://example.atlassian.net',
			required: true,
		},
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
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.atlassian.com/oauth/token',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'audience=api.atlassian.com&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: defaultScopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		},
	];
}
