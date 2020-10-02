import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

//https://api.slack.com/authentication/oauth-v2
const userScopes = [
	'chat:write',
	'files:read',
	'files:write',
	'stars:read',
	'stars:write',
	'users.profile:read',
	'users.profile:write'
];

export class SlackOAuth2Api implements ICredentialType {
	name = 'slackOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Slack OAuth2 API';
	documentationUrl = 'slack';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://slack.com/oauth/v2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://slack.com/api/oauth.v2.access',
		},
		//https://api.slack.com/scopes
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'chat:write',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: `user_scope=${userScopes.join(' ')}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
