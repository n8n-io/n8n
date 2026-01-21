import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

/**
 * OIDC Authentication Credential
 *
 * Supports two modes:
 * 1. Token Validation (Webhook): Validates incoming Bearer tokens using JWKS
 * 2. Authorization Code Flow (Form/Chat): Full OIDC login redirect flow
 *
 * Compatible with Azure AD, Okta, Auth0, Keycloak, and any OIDC-compliant IdP.
 */
// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class OidcWebhookAuth implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'oidcWebhookAuth';

	displayName = 'OIDC Auth';

	documentationUrl = 'oidc';

	icon: Icon = 'file:icons/oidc.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Discovery URL',
			name: 'discoveryUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder:
				'https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration',
			description: 'OIDC discovery endpoint URL (.well-known/openid-configuration)',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'your-client-id',
			description: 'OAuth2 Client ID from your identity provider',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'your-client-secret',
			description:
				'OAuth2 Client Secret (required for confidential clients, optional if using PKCE only)',
		},
		{
			displayName: 'Scopes',
			name: 'scopes',
			type: 'string',
			default: 'openid profile email',
			required: true,
			placeholder: 'openid profile email',
			description: 'Space-separated list of OAuth2 scopes to request',
		},
		{
			displayName: 'Expected Issuer',
			name: 'issuer',
			type: 'string',
			default: '',
			placeholder: 'https://login.microsoftonline.com/{tenant}/v2.0',
			description:
				'Expected issuer (iss) claim value for token validation. If empty, uses the issuer from the discovery document.',
		},
		{
			displayName: 'Expected Audience',
			name: 'audience',
			type: 'string',
			default: '',
			placeholder: 'api://your-app-id',
			description:
				'Expected audience (aud) claim for token validation. If empty, uses the Client ID as the expected audience.',
		},
		{
			displayName: 'Session Secret',
			name: 'sessionSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'random-secret-for-signing-session-cookies',
			description:
				'Secret key for signing session cookies. Use a long random string (32+ characters).',
		},
		{
			displayName: 'Session Duration (Hours)',
			name: 'sessionDurationHours',
			type: 'number',
			default: 8,
			description: 'How long the session remains valid after login (in hours)',
		},
	];
}
