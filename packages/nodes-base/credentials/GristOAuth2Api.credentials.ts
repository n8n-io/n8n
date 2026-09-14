import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// Resource scopes from Grist's OAuth-apps authorization server
// (/.well-known/oauth-authorization-server).
const scopes = [
	'offline_access', // issue a refresh token, so the connection outlives the 1 h access token
	'doc:read', // read records
	'doc:write', // create, update, and delete records
];

// Mirrors `normalizeBaseUrl` in the node's GenericFunctions. Built with `new RegExp` because a
// `/.../` literal inside an expression string is awkward to escape.
const normalizedUrlExpr =
	'$self["url"].replace(new RegExp("/$"), "").replace(new RegExp("/api$"), "")';

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
				'Defaults to hosted Grist. Use https://YOUR_TEAM.getgrist.com for a single team, or your own URL if self-managed with OAuth apps enabled. Do not include /api.',
		},
		{
			// Grist mounts the OAuth endpoints on every host and canonicalizes the flow to its login
			// server, so deriving them from the Grist URL works for hosted and self-managed alike.
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: `={{${normalizedUrlExpr}}}/oidc/auth`,
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: `={{${normalizedUrlExpr}}}/oidc/token`,
			required: true,
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: scopes.join(' '),
			description: 'Space-separated list of OAuth2 scopes to request',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{($self["customScopes"] && $self["enabledScopes"]) ? $self["enabledScopes"] : "' +
				scopes.join(' ') +
				'"}}',
		},
		{
			// Required: Grist's provider silently drops `offline_access` unless consent is prompted,
			// leaving no refresh token, so the credential would fail once the access token expires.
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
