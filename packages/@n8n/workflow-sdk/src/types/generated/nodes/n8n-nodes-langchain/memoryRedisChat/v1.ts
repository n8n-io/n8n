/**
 * Redis Chat Memory Node - Version 1
 * Stores the chat history in Redis.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV1Params {
/**
 * The key to use to store the memory in the workflow data
 * @default chat_history
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

export interface LcMemoryRedisChatV1Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryRedisChatV1Node = {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1;
	config: NodeConfig<LcMemoryRedisChatV1Params>;
	credentials?: LcMemoryRedisChatV1Credentials;
	isTrigger: true;
};