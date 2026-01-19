/**
 * Xata Node - Version 1.2
 * Use Xata Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV12Config {
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
// Node Types
// ===========================================================================

interface LcMemoryXataV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1.2;
	credentials?: LcMemoryXataV12Credentials;
	isTrigger: true;
}

export type LcMemoryXataV12Node = LcMemoryXataV12NodeBase & {
	config: NodeConfig<LcMemoryXataV12Config>;
};

export type LcMemoryXataV12Node = LcMemoryXataV12Node;