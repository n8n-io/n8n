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
	'groups:write',
	'im:read',
	'im:write',
	'mpim:read',
	'mpim:write',
	'reactions:read',
	'reactions:write',
	'usergroups:write',
	'usergroups:read',
	'users.profile:read',
	'users:read',
];

const userScopes = [
	...scopes,
	'stars:read',
	'stars:write',
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
			default: scopes.join(' '),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: `user_scope=${userScopes.join(' ')}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: `Use Bot's Access Token`,
			name: 'useBotToken',
			type: 'boolean',
			default: false,
			description: `Whether to use the bot's access token or user's access token`,
			hint: `While using bot's access token you wouldn't be able to create channel, update user profile, do operations with stars resource!`,
		},
	];
}
