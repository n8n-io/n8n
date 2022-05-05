import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClickUpOAuth2Api implements ICredentialType {
	name = 'clickUpOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'ClickUp OAuth2 API';
	documentationUrl = 'clickUp';
	properties: INodeProperties[] = [
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
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://app.clickup.com/api',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.clickup.com/api/v2/oauth/token',
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
			default: 'body',
		},
	];
}
