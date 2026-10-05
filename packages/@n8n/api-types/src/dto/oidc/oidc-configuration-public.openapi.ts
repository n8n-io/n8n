import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const oidcConfigurationFieldDocs = {
	clientId: {
		description: 'The client ID issued when registering n8n with the OIDC provider.',
		example: 'n8n-client',
	},
	clientSecret: {
		description:
			'The client secret issued when registering n8n with the OIDC provider. Redacted on read when set; never echoed back in plaintext.',
		example: '**hidden**',
	},
	discoveryEndpoint: {
		format: 'uri',
		description: "The OIDC provider's well-known discovery endpoint.",
		example: 'https://accounts.google.com/.well-known/openid-configuration',
	},
	loginEnabled: {
		description: 'Whether OIDC single sign-on is enabled.',
		example: false,
	},
	prompt: {
		description: 'The prompt parameter to use when authenticating with the OIDC provider.',
		example: 'select_account',
	},
	authenticationContextClassReference: {
		description:
			'ACR values to include in the authorization request (acr_values parameter), in order of preference.',
		example: ['mfa', 'pwd'] as string[],
	},
	additionalScopes: {
		description:
			'Additional scopes to request, space separated. n8n always requests `openid`, `profile` and `email`.',
		example: 'groups roles',
	},
	emailVerifiedRequired: {
		description:
			"Whether the identity provider must assert that the user's email address is verified before the login is accepted. When disabled, only an explicit negative assertion is rejected.",
		example: false,
	},
	rpInitiatedLogoutEnabled: {
		description:
			'Whether signing out of n8n also ends the session at the OIDC provider via RP-Initiated Logout. When disabled, sign-out is local to n8n only.',
		example: false,
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const oidcConfigurationUpdateFieldDocs = {
	clientSecret: {
		description:
			'The client secret issued when registering n8n with the OIDC provider. Submit the redacted sentinel value returned on read to keep the stored secret unchanged.',
		example: 'my-client-secret',
	},
	prompt: {
		description: 'The prompt parameter to use when authenticating.',
		example: 'select_account',
	},
	authenticationContextClassReference: {
		description:
			'ACR values to include in the authorization request (acr_values parameter), in order of preference. Use an empty array when unused.',
		example: ['mfa', 'pwd'] as string[],
	},
	additionalScopes: {
		description:
			'Additional scopes to request, space separated. n8n always requests `openid`, `profile` and `email`. Use an empty string when unused.',
		example: 'groups roles',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
