import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GithubOAuth2Api implements ICredentialType {
	name = 'githubOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'GitHub OAuth2 API';
	documentationUrl = 'github';
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Github Server',
			name: 'server',
			type: 'string',
			default: 'https://api.github.com',
			description: 'The server to connect to. Only has to be set if Github Enterprise is used.',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{$self["server"] === "https://api.github.com" ? "https://github.com" : $self["server"]}}/login/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{$self["server"] === "https://api.github.com" ? "https://github.com" : $self["server"]}}/login/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'repo,admin:repo_hook,admin:org,admin:org_hook,gist,notifications,user,write:packages,read:packages,delete:packages,workflow',
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
