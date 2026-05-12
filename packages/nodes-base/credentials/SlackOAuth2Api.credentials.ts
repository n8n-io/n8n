import type { ICredentialType, INodeProperties } from 'n8n-workflow';

//https://api.slack.com/authentication/oauth-v2
export const userScopes = [
	'channels:read',
	'channels:write',
	'channels:history',
	'chat:write',
	'files:read',
	'files:write',
	'groups:read',
	'groups:history',
	'im:read',
	'im:history',
	'mpim:read',
	'mpim:history',
	'reactions:read',
	'reactions:write',
	'stars:read',
	'stars:write',
	'usergroups:write',
	'usergroups:read',
	'users.profile:read',
	'users.profile:write',
	'users:read',
	'search:read',
];

export class SlackOAuth2Api implements ICredentialType {
	name = 'slackOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Slack OAuth2 API';

	documentationUrl = 'slack';

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
			default: 'https://slack.com/oauth/v2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://slack.com/api/oauth.v2.access',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
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
			displayName: 'User Scope',
			name: 'userScope',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: userScopes.join(' '),
			description: 'Space-separated user-level scopes for your Slack app',
		},
		//https://api.slack.com/scopes
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: `={{$self["customScopes"] ? "user_scope=" + $self["userScope"] : "user_scope=${userScopes.join(' ')}"}}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName:
				'If you get an Invalid Scopes error, make sure you add the correct one <a target="_blank" href="https://docs.n8n.io/integrations/builtin/credentials/slack/#using-oauth">here</a> to your Slack integration',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
