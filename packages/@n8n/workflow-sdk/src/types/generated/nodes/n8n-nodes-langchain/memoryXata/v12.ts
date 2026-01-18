/**
 * Xata Node - Version 1.2
 * Use Xata Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV12Params {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
	contextWindowLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryXataV12Credentials {
	xataApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryXataV12Node = {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1.2;
	config: NodeConfig<LcMemoryXataV12Params>;
	credentials?: LcMemoryXataV12Credentials;
	isTrigger: true;
};