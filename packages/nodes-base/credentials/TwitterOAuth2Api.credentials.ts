import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['twitter:write', 'tweet:read', 'forms:read'];
export class TwitterOAuth2Api implements ICredentialType {
	name = 'twitterOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Twitter OAuth2 API';

	documentationUrl = 'twitter';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://api.twitter.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.twitter.com/oauth/access_token',
		},
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
			default: `user_scope=${scopes.join(' ')}`,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
