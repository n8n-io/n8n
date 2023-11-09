import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['schema.bases:read', 'data.records:read', 'data.records:write'];

export class AirtableOAuth2Api implements ICredentialType {
	name = 'airtableOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Airtable OAuth2 API';

	documentationUrl = 'airtable';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://airtable.com/oauth2/v1/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://airtable.com/oauth2/v1/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: `${scopes.join(' ')}`,
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
