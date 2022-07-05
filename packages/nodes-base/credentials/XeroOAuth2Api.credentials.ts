import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'offline_access',
	'accounting.transactions',
	'accounting.settings',
	'accounting.contacts',
];

export class XeroOAuth2Api implements ICredentialType {
	name = 'xeroOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Xero OAuth2 API';
	documentationUrl = 'xero';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://login.xero.com/identity/connect/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://identity.xero.com/connect/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
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
		},
	];
}
