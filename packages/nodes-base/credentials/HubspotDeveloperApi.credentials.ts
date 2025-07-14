import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'crm.objects.contacts.read',
	'crm.schemas.contacts.read',
	'crm.objects.companies.read',
	'crm.schemas.companies.read',
	'crm.objects.deals.read',
	'crm.schemas.deals.read',
];

// eslint-disable-next-line n8n-nodes-base/cred-class-name-missing-oauth2-suffix
export class HubspotDeveloperApi implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-missing-oauth2
	name = 'hubspotDeveloperApi';

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2
	displayName = 'HubSpot Developer API';

	documentationUrl = 'hubspot';

	extends = ['oAuth2Api'];

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
		{
			displayName: 'Developer API Key',
			name: 'apiKey',
			type: 'string',
			required: true,
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'APP ID',
			name: 'appId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
