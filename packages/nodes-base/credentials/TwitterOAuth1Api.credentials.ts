import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TwitterOAuth1Api implements ICredentialType {
	name = 'twitterOAuth1Api';

	extends = ['oAuth1Api'];

	displayName = 'X OAuth API';

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
			displayName:
				'Some operations require a Basic or Pro API. Refer to <a href="https://developer.x.com/en/docs/twitter-api" target="_blank">X API Docs</a> for more information.',
			name: 'apiPermissions',
			type: 'notice',
			default: '',
		},
	];
}
