/**
 * TOTP Node - Version 1
 * Generate a time-based one-time password
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TotpV1Config {
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
// Node Types
// ===========================================================================

interface TotpV1NodeBase {
	type: 'n8n-nodes-base.totp';
	version: 1;
	credentials?: TotpV1Credentials;
}

export type TotpV1Node = TotpV1NodeBase & {
	config: NodeConfig<TotpV1Config>;
};

export type TotpV1Node = TotpV1Node;