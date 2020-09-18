import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ZohoOAuth2Api implements ICredentialType {
	name = 'zohoOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Zoho OAuth2 API';
	documentationUrl = 'zoho';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'https://accounts.zoho.com/oauth/v2/auth',
					value: 'https://accounts.zoho.com/oauth/v2/auth',
					description: 'For the EU, AU, and IN domains',
				},
				{
					name: 'https://accounts.zoho.com.cn/oauth/v2/auth',
					value: 'https://accounts.zoho.com.cn/oauth/v2/auth',
					description: 'For the CN domain',
				},
			],
			default: 'https://accounts.zoho.com/oauth/v2/auth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'US - https://accounts.zoho.com/oauth/v2/token',
					value: 'https://accounts.zoho.com/oauth/v2/token',
				},
				{
					name: 'AU - https://accounts.zoho.com.au/oauth/v2/token',
					value: 'https://accounts.zoho.com.au/oauth/v2/token',
				},
				{
					name: 'EU - https://accounts.zoho.eu/oauth/v2/token',
					value: 'https://accounts.zoho.eu/oauth/v2/token',
				},
				{
					name: 'IN - https://accounts.zoho.in/oauth/v2/token',
					value: 'https://accounts.zoho.in/oauth/v2/token',
				},
				{
					name: 'CN - https://accounts.zoho.com.cn/oauth/v2/token',
					value: ' https://accounts.zoho.com.cn/oauth/v2/token',
				},
			],
			default: 'https://accounts.zoho.com/oauth/v2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'ZohoCRM.modules.ALL,ZohoCRM.settings.all,ZohoCRM.users.all',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
