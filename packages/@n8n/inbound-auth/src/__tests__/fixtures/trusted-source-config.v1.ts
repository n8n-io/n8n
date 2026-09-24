/** A fully-specified v1 document, used by the migration-chain test harness. */
export const trustedSourceConfigV1Fixture = {
	version: 1,
	authentication: {
		type: 'oauth2',
		discovery: { mode: 'auto' },
		keys: { kind: 'jwks-uri' },
		verification: { mode: 'jwt' },
		algorithms: ['RS256', 'ES256'],
		maxTokenLifetimeSeconds: 3600,
		clockSkewSeconds: 30,
	},
	surfaces: { 'public-api': {} },
	identity: {
		subject: 'binding',
		claimMapping: {
			subject: 'sub',
			email: 'email',
			emailVerified: 'email_verified',
			displayName: 'name',
			clientId: 'client_id',
			scopes: 'scope',
		},
		linkByEmail: 'verified-only',
		provision: { human: 'off' },
		roleMapping: { mode: 'off', instanceRoleRules: [], projectRoleRules: [] },
	},
} satisfies Record<string, unknown>;
