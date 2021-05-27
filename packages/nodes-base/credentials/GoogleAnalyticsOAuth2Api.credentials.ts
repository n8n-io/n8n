import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/analytics',
	'https://www.googleapis.com/auth/analytics.readonly',
];


export class GoogleAnalyticsOAuth2Api implements ICredentialType {
	name = 'googleAnalyticsOAuth2';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Analytics OAuth2 API';
	documentationUrl = 'google';
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
	];
}
