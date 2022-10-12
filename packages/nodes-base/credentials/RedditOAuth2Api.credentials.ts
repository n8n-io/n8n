import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['identity', 'edit', 'history', 'mysubreddits', 'read', 'save', 'submit'];

// https://github.com/reddit-archive/reddit/wiki/OAuth2

export class RedditOAuth2Api implements ICredentialType {
	name = 'redditOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Reddit OAuth2 API';
	documentationUrl = 'reddit';
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
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
			default: 'grant_type=authorization_code',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'duration=permanent',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.reddit.com/api/v1/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://www.reddit.com/api/v1/access_token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
