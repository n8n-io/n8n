import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TwitterOAuth1Api implements ICredentialType {
	name = 'twitterOAuth1Api';
	extends = ['oAuth1Api'];
	displayName = 'Twitter OAuth API';
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
	];
}
