import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class InstagramBasicDisplayOAuth2Api implements ICredentialType {
	name = 'instagramBasicDisplayOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Instagram Basic Display OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.instagram.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.instagram.com/oauth/access_token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'user_profile,user_media',
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
