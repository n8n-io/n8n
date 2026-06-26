import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// Resource scopes from Grist's OAuth-apps authorization server
// (/.well-known/oauth-authorization-server). The identity scopes (openid/email/
// profile) belong to the separate Sign-in-with-Grist server and are not valid here.
const scopes = ['offline_access', 'doc:read', 'doc:write', 'doc:webhooks'];

export class GristOAuth2Api implements ICredentialType {
	name = 'gristOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Grist OAuth2 API';

	documentationUrl = 'grist';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Grist URL',
			name: 'url',
			type: 'string',
			default: 'https://api.getgrist.com',
			required: true,
			description:
				'The default works for any hosted Grist account. To restrict this connection to a single team, use https://YOUR_TEAM.getgrist.com. For self-managed Grist with OAuth Apps enabled, use your instance URL (without /api and no trailing slash).',
		},
		{
			// Grist mounts the OAuth endpoints on every host and canonicalizes the flow to its login
			// server, so deriving them from the same Grist URL works for hosted and self-managed alike.
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '={{$self["url"]}}/oidc/auth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["url"]}}/oidc/token',
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
			default: 'prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
