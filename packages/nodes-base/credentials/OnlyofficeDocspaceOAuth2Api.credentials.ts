import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: string[] = ['files:read', 'files:write', 'rooms:read', 'rooms:write'];

export class OnlyofficeDocspaceOAuth2Api implements ICredentialType {
	name = 'onlyofficeDocspaceOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'ONLYOFFICE DocSpace OAuth2 API';

	documentationUrl = 'onlyofficeDocspace';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization Base URL',
			name: 'authBaseUrl',
			type: 'string',
			default: 'https://oauth.onlyoffice.com',
			description: 'The base URL of your ONLYOFFICE DocSpace authorization service',
			required: true,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{$self["authBaseUrl"].endsWith("/") ? $self["authBaseUrl"].slice(0, -1) : $self["authBaseUrl"]}}/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{$self["authBaseUrl"].endsWith("/") ? $self["authBaseUrl"].slice(0, -1) : $self["authBaseUrl"]}}/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
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
