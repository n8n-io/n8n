/**
 * Redis Chat Memory Node Types
 *
 * Stores the chat history in Redis.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/memoryredischat/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV15Params {
	/**
	 * The key to use to store the memory in the workflow data
	 * @default chat_history
	 */
	sessionKey?: string | Expression<string>;
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
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

export type LcMemoryRedisChatV15Node = {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5;
	config: NodeConfig<LcMemoryRedisChatV15Params>;
	credentials?: LcMemoryRedisChatV15Credentials;
	isTrigger: true;
};

export type LcMemoryRedisChatNode = LcMemoryRedisChatV15Node;
