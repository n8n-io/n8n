/**
 * Xata Node Types
 *
 * Use Xata Memory
 * @subnodeType ai_memory
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/memoryxata/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV14Params {
	sessionId: string | Expression<string>;
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
	/**
	 * The key to use to store session ID in the memory
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
// Node Types
// ===========================================================================

export type LcMemoryXataV14Node = {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4;
	config: NodeConfig<LcMemoryXataV14Params>;
	credentials?: LcMemoryXataV14Credentials;
	isTrigger: true;
};

export type LcMemoryXataNode = LcMemoryXataV14Node;
