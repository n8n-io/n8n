import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'boards:write',
	'boards:read',
];

export class MondayComOAuth2Api implements ICredentialType {
	name = 'mondayComOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Monday.com OAuth2 API';
	documentationUrl = 'monday';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://auth.monday.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://auth.monday.com/oauth2/token',
			required: true,
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
