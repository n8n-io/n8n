/**
 * Xata Node - Version 1
 * Use Xata Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV1Params {
	sessionId: string | Expression<string>;
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

export interface LcMemoryXataV1Credentials {
	xataApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryXataV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1;
	credentials?: LcMemoryXataV1Credentials;
	isTrigger: true;
}

export type LcMemoryXataV1ParamsNode = LcMemoryXataV1NodeBase & {
	config: NodeConfig<LcMemoryXataV1Params>;
};

export type LcMemoryXataV1Node = LcMemoryXataV1ParamsNode;