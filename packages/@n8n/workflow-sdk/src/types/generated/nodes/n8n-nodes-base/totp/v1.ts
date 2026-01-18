/**
 * TOTP Node - Version 1
 * Generate a time-based one-time password
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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

export type TotpV1Node = {
	type: 'n8n-nodes-base.totp';
	version: 1;
	config: NodeConfig<TotpV1Params>;
	credentials?: TotpV1Credentials;
};