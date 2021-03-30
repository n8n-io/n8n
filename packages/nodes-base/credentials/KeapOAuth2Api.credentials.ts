import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'full',
];

export class KeapOAuth2Api implements ICredentialType {
	name = 'keapOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Keap OAuth2 API';
	documentationUrl = 'keap';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://signin.infusionsoft.com/app/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.infusionsoft.com/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
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
