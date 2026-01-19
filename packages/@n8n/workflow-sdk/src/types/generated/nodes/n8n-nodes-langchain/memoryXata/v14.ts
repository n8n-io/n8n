/**
 * Xata Node - Version 1.4
 * Use Xata Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV14Params {
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
// Node Types
// ===========================================================================

interface LcMemoryXataV14NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1.4;
	credentials?: LcMemoryXataV14Credentials;
	isTrigger: true;
}

export type LcMemoryXataV14ParamsNode = LcMemoryXataV14NodeBase & {
	config: NodeConfig<LcMemoryXataV14Params>;
};

export type LcMemoryXataV14Node = LcMemoryXataV14ParamsNode;