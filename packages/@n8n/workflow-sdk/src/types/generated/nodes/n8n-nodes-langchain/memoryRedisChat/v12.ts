/**
 * Redis Chat Memory Node - Version 1.2
 * Stores the chat history in Redis.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV12Params {
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

export interface LcMemoryRedisChatV12Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryRedisChatV12Node = {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1.2;
	config: NodeConfig<LcMemoryRedisChatV12Params>;
	credentials?: LcMemoryRedisChatV12Credentials;
	isTrigger: true;
};