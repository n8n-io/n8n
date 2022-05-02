import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GoToWebinarOAuth2Api implements ICredentialType {
	name = 'goToWebinarOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'GoToWebinar OAuth2 API';
	documentationUrl = 'goToWebinar';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://api.getgo.com/oauth/v2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.getgo.com/oauth/v2/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '', // set when creating the OAuth client
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
