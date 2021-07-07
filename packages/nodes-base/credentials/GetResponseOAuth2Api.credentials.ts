import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GetResponseOAuth2Api implements ICredentialType {
	name = 'getResponseOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'GetResponse OAuth2 API';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://app.getresponse.com/oauth2_authorize.html',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.getresponse.com/v3/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
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
			description: 'Resource to consume.',
		},
	];
}
