import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'crm.schemas.deals.read',
	'crm.objects.owners.read',
	'crm.objects.contacts.write',
	'crm.objects.companies.write',
	'crm.objects.companies.read',
	'crm.objects.deals.read',
	'crm.schemas.contacts.read',
	'crm.objects.deals.write',
	'crm.objects.contacts.read',
	'crm.schemas.companies.read',
	'forms',
	'tickets',
];

export class HubspotOAuth2Api implements ICredentialType {
	name = 'hubspotOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'HubSpot OAuth2 API';

	documentationUrl = 'hubspot';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
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
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
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
		},
	];
}
