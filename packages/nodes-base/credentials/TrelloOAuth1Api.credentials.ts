import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TrelloOAuth1Api implements ICredentialType {
	name = 'trelloOAuth1Api';

	extends = ['oAuth1Api'];

	displayName = 'Trello OAuth1 API';

	documentationUrl = 'trello';

	properties: INodeProperties[] = [
		{
			displayName: 'Request Token URL',
			name: 'requestTokenUrl',
			type: 'hidden',
			default: 'https://trello.com/1/OAuthGetRequestToken',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'https://trello.com/1/OAuthAuthorizeToken?scope=read,write,account&expiration=never&name=n8n',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://trello.com/1/OAuthGetAccessToken',
		},
		{
			displayName: 'Signature Method',
			name: 'signatureMethod',
			type: 'hidden',
			default: 'HMAC-SHA1',
		},
	];
}
