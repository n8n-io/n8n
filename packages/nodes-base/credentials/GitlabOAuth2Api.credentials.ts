import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class GitlabOAuth2Api implements ICredentialType {
	name = 'gitlabOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Gitlab OAuth2 API';
	documentationUrl = 'gitlab';
	properties = [
		{
			displayName: 'Gitlab Server',
			name: 'server',
			type: 'string' as NodePropertyTypes,
			default: 'https://gitlab.com',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: '={{$parameter["server"]}}/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: '={{$parameter["server"]}}/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'api',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
