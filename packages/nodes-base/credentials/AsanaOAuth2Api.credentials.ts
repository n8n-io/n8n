import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AsanaOAuth2Api implements ICredentialType {
	name = 'asanaOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Asana OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://app.asana.com/-/oauth_authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://app.asana.com/-/oauth_token',
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
			description: 'Resource to consume.',
		},
	];
}
