import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'tweet.read',
	'users.read',
	'tweet.write',
	'tweet.moderate.write',
	'users.read',
	'follows.read',
	'follows.write',
	'offline.access',
	'like.read',
	'like.write',
	'dm.write',
	'dm.read',
	'list.read',
	'list.write',
];
export class TwitterOAuth2Api implements ICredentialType {
	name = 'twitterOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'X OAuth2 API';

	documentationUrl = 'twitter';

	properties: INodeProperties[] = [
		{
			displayName:
				'Some operations requires a Basic or a Pro API for more informations see <a href="https://developer.twitter.com/en/products/twitter-api" target="_blank">X API Docs</a>',
			name: 'apiPermissioms',
			type: 'notice',
			default: '',
		},
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
			default: 'https://twitter.com/i/oauth2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.twitter.com/2/oauth2/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: `${scopes.join(' ')}`,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
