/**
 * TOTP Node Types
 *
 * Generate a time-based one-time password
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/totp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TotpV1Params {
	operation?: 'generateSecret' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TotpV1Credentials {
	totpApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TotpNode = {
	type: 'n8n-nodes-base.totp';
	version: 1;
	config: NodeConfig<TotpV1Params>;
	credentials?: TotpV1Credentials;
};
