import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'crm.objects.contacts.read',
	'crm.schemas.contacts.read',
	'crm.objects.companies.read',
	'crm.schemas.companies.read',
	'crm.objects.deals.read',
	'crm.schemas.deals.read',
];

export class HubspotDeveloperApi implements ICredentialType {
	name = 'hubspotDeveloperApi';
	displayName = 'Hubspot Developer API';
	documentationUrl = 'hubspot';
	extends = [
		'oAuth2Api',
	];
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://app.hubspot.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.hubapi.com/oauth/v1/token',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'grant_type=authorization_code',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
			description: 'Resource to consume.',
		},
		{
			displayName: 'Developer API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'APP ID',
			name: 'appId',
			type: 'string',
			required: true,
			default: '',
			description: 'The APP ID',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
