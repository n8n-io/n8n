import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'com.intuit.quickbooks.accounting',
	'com.intuit.quickbooks.payment',
];

// https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization

export class QuickBooksOAuth2Api implements ICredentialType {
	name = 'quickBooksOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'QuickBooks OAuth2 API';
	documentationUrl = 'quickbooks';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://appcenter.intuit.com/connect/oauth2',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
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
			default: 'header',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options' as NodePropertyTypes,
			default: 'production',
			options: [
				{
					name: 'Production',
					value: 'production',
				},
				{
					name: 'Sandbox',
					value: 'sandbox',
				},
			],
		},
	];
}
