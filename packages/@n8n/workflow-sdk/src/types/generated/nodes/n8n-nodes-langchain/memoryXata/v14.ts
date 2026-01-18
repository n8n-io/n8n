/**
 * Xata Node - Version 1.4
 * Use Xata Memory
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV14Params {
	sessionId: string | Expression<string>;
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
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

export interface LcMemoryXataV14Credentials {
	xataApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryXataV14Node = {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4;
	config: NodeConfig<LcMemoryXataV14Params>;
	credentials?: LcMemoryXataV14Credentials;
	isTrigger: true;
};