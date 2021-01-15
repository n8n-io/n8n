import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SalesforceOAuth2Api implements ICredentialType {
	name = 'salesforceOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Salesforce OAuth2 API';
	documentationUrl = 'salesforce';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://login.salesforce.com/services/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://yourcompany.salesforce.com/services/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'full refresh_token',
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
			description: 'Method of authentication.',
		},
	];
}
