import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZammadOAuth2Api implements ICredentialType {
	name = 'zammadOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'OZammad OAuth2 API';
	documentationUrl = 'zammad';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://your_url.zammad.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://your_url.zammad.com/oauth/token',
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
		},
	];
}
