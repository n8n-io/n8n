/**
 * Redis Chat Memory Node - Version 1.4
 * Stores the chat history in Redis.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV14Config {
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

export interface LcMemoryRedisChatV14Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryRedisChatV14NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1.4;
	credentials?: LcMemoryRedisChatV14Credentials;
	isTrigger: true;
}

export type LcMemoryRedisChatV14Node = LcMemoryRedisChatV14NodeBase & {
	config: NodeConfig<LcMemoryRedisChatV14Config>;
};

export type LcMemoryRedisChatV14Node = LcMemoryRedisChatV14Node;