import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

// https://developer.raindrop.io/v1/authentication

export class RaindropOAuth2Api implements ICredentialType {
	name = 'raindropOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Raindrop OAuth2 API';
	documentationUrl = 'raindrop';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://raindrop.io/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://raindrop.io/oauth/access_token',
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
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
	];
}
