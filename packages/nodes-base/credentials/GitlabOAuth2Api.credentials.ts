import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class GitlabOAuth2Api implements ICredentialType {
	name = 'gitlabOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Gitlab OAuth2 API';
	documentationUrl = 'gitlab';
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
			displayName: 'Gitlab Server',
			name: 'server',
			type: 'string',
			default: 'https://gitlab.com',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '={{$self["server"]}}/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["server"]}}/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'api',
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
