/**
 * Xata Node - Version 1.1
 * Use Xata Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV11Params {
/**
 * The key to use to store the memory
 * @default ={{ $json.sessionId }}
 */
		sessionId?: string | Expression<string>;
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

export interface LcMemoryXataV11Credentials {
	xataApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryXataV11Node = {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1.1;
	config: NodeConfig<LcMemoryXataV11Params>;
	credentials?: LcMemoryXataV11Credentials;
	isTrigger: true;
};