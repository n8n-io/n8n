import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HelpScoutOAuth2Api implements ICredentialType {
	name = 'helpScoutOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'HelpScout OAuth2 API';
	documentationUrl = 'helpScout';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://secure.helpscout.net/authentication/authorizeClientApplication',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.helpscout.net/v2/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
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
