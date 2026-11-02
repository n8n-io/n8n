import type { TrustedSourceConfigInput } from '@n8n/inbound-auth';

// The seeder writes these, and a trigger node without a `trustedSource` parameter defaults to the
// id. Pipeline code must not compare a source id or name with them: the system source is a plain
// oauth2 source to every surface.
export { SYSTEM_TRUSTED_SOURCE_ID } from '@n8n/inbound-auth';
export const SYSTEM_TRUSTED_SOURCE_NAME = 'n8n';
export const SYSTEM_TRUSTED_SOURCE_CONFIG = {
	version: 1,
	authentication: {
		type: 'oauth2',
		discovery: { mode: 'auto' },
		keys: { kind: 'local-keystore' },
		verification: { mode: 'jwt' },
		client: { kind: 'virtual' },
	},
	surfaces: { 'public-api': {}, 'instance-mcp': {}, trigger: {}, apps: {} },
	identity: {
		subject: 'n8n-user-id',
		claimMapping: { subject: 'sub', clientId: 'client_id', scopes: 'scope' },
		linkByEmail: 'off',
		provision: { human: 'off' },
		roleMapping: { mode: 'off', instanceRoleRules: [], projectRoleRules: [] },
	},
} satisfies TrustedSourceConfigInput;
