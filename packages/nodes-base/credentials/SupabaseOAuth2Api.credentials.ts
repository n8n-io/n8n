import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SupabaseOAuth2Api implements ICredentialType {
	name = 'supabaseOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Supabase OAuth2 API';

	documentationUrl = 'supabase';

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
		// Scopes are specified when creating the OAuth app in Supabase
		// including them from the client during auth does nothing
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
			displayName: 'Use PKCE',
			name: 'usePkce',
			type: 'hidden',
			default: true,
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
