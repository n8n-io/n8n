/**
 * Redis Chat Memory Node - Version 1.5
 * Stores the chat history in Redis.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV15Config {
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

export interface LcMemoryRedisChatV15Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryRedisChatV15NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1.5;
	credentials?: LcMemoryRedisChatV15Credentials;
	isTrigger: true;
}

export type LcMemoryRedisChatV15Node = LcMemoryRedisChatV15NodeBase & {
	config: NodeConfig<LcMemoryRedisChatV15Config>;
};

export type LcMemoryRedisChatV15Node = LcMemoryRedisChatV15Node;