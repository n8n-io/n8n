import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class GoogleOAuth2Api implements ICredentialType {
	name = 'googleOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Google OAuth2 API';
	documentationUrl = 'google';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://accounts.google.com/o/oauth2/v2/auth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://oauth2.googleapis.com/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
