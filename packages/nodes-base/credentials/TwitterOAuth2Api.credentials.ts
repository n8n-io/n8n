import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TwitterOAuth2Api implements ICredentialType {
	name = 'twitterOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Twitter OAuth2 API';

	documentationUrl = 'twitter';

	properties: INodeProperties[] = [
		{
			displayName: 'Request Token URL',
			name: 'requestTokenUrl',
			type: 'hidden',
			default: 'https://api.twitter.com/oauth/request_token',
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
			displayName: 'Signature Method',
			name: 'signatureMethod',
			type: 'hidden',
			default: 'HMAC-SHA1',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
				},
				{
					name: 'Authorization Code with PKCE',
					value: 'pkce',
				},
			],
			default: 'authorizationCode',
		},
	];
}
