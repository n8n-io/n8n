import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EloquaOAuth2Api implements ICredentialType {
	name = 'eloquaOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Oracle Eloqua OAuth2 API';
	documentationUrl = 'eloqua';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://login.eloqua.com/auth/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://login.eloqua.com/auth/oauth2/token',
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