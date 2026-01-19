/**
 * Redis Chat Memory Node - Version 1.3
 * Stores the chat history in Redis.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV13Params {
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
/**
 * For how long the session should be stored in seconds. If set to 0 it will not expire.
 * @default 0
 */
		sessionTTL?: number | Expression<number>;
	contextWindowLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryRedisChatV13Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryRedisChatV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1.3;
	credentials?: LcMemoryRedisChatV13Credentials;
	isTrigger: true;
}

export type LcMemoryRedisChatV13ParamsNode = LcMemoryRedisChatV13NodeBase & {
	config: NodeConfig<LcMemoryRedisChatV13Params>;
};

export type LcMemoryRedisChatV13Node = LcMemoryRedisChatV13ParamsNode;