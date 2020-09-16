import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PhilipsHueOAuth2Api implements ICredentialType {
	name = 'philipsHueOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'PhilipHue OAuth2 API';
	documentationUrl = 'philipsHue';
	properties = [
		{
			displayName: 'APP ID',
			name: 'appId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.meethue.com/oauth2/auth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.meethue.com/oauth2/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '={{"appid="+$parameter["appId"]}}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'header',
			description: 'Method of authentication.',
		},
	];
}
