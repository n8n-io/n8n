import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SupabaseManagementOAuth2Api implements ICredentialType {
	name = 'supabaseManagementOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Supabase Management OAuth2 API';

	documentationUrl = 'supabase';

	properties: INodeProperties[] = [
		{
			displayName: 'Project Reference',
			name: 'projectRef',
			type: 'string',
			default: '',
			placeholder: 'abcdefghijklmnopqrst',
			description:
				'The 20-character project reference ID from your Supabase project Settings → General',
		},
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
			default: 'https://api.supabase.com/v1/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.supabase.com/v1/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
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
