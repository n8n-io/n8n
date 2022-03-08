import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

//https://api.slack.com/authentication/oauth-v2
const scopes = [
	'chat:write',
	'files:read',
	'files:write',
	'groups:read',
	'im:read',
	'mpim:read',
	'reactions:read',
	'reactions:write',
	'users.profile:read',
];

const userScopes = [
	...scopes,
	'stars:read',
	'stars:write',
	'usergroups:write',
	'usergroups:read',
	'users.profile:read',
	'users.profile:write',
];

export class SlackOAuth2Api implements ICredentialType {
	name = 'slackOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Slack OAuth2 API';
	documentationUrl = 'slack';
	properties: INodeProperties[] = [
		{
			displayName: 'Token Type',
			name: 'authQueryParameters',
			type: 'options',
			options: [
				{
					name: 'Bot Token',
					value: `scope=${scopes.join(',')}`,
					description: 'Authorize as a bot',
				},
				{
					name: 'User Token',
					value: `user_scope=${userScopes.join(' ')}`,
					description: 'Authorize as an user',
				},
			],
			default: `user_scope=${userScopes.join(' ')}`,
			description: 'Bot Token is recommended.',
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
		//https://api.slack.com/scopes
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'chat:write',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
