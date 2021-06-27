import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SalesforceOAuth2Api implements ICredentialType {
	name = 'salesforceOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Salesforce OAuth2 API';
	documentationUrl = 'salesforce';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://login.salesforce.com/services/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: 'https://yourcompany.salesforce.com/services/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'full refresh_token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
			description: 'Method of authentication.',
		},
	];
}
