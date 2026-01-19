/**
 * Xata Node - Version 1.3
 * Use Xata Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV13Params {
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

export interface LcMemoryXataV13Credentials {
	xataApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryXataV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1.3;
	credentials?: LcMemoryXataV13Credentials;
	isTrigger: true;
}

export type LcMemoryXataV13ParamsNode = LcMemoryXataV13NodeBase & {
	config: NodeConfig<LcMemoryXataV13Params>;
};

export type LcMemoryXataV13Node = LcMemoryXataV13ParamsNode;