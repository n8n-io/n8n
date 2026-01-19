/**
 * Xata Node - Version 1.1
 * Use Xata Memory
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryXataV11Config {
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
// Node Types
// ===========================================================================

interface LcMemoryXataV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryXata';
	version: 1.1;
	credentials?: LcMemoryXataV11Credentials;
	isTrigger: true;
}

export type LcMemoryXataV11Node = LcMemoryXataV11NodeBase & {
	config: NodeConfig<LcMemoryXataV11Config>;
};

export type LcMemoryXataV11Node = LcMemoryXataV11Node;