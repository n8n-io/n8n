import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MauticOAuth2Api implements ICredentialType {
	name = 'mauticOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Mautic OAuth2 API';
	documentationUrl = 'mautic';
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://name.mautic.net',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{$self["url"].endsWith("/") ? $self["url"].slice(0, -1) : $self["url"]}}/oauth/v2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{$self["url"].endsWith("/") ? $self["url"].slice(0, -1) : $self["url"]}}/oauth/v2/token',
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
