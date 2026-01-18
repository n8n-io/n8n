/**
 * Redis Chat Memory Node - Version 1.1
 * Stores the chat history in Redis.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryRedisChatV11Params {
/**
 * The key to use to store the memory
 * @default ={{ $json.sessionId }}
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

export interface LcMemoryRedisChatV11Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryRedisChatV11Node = {
	type: '@n8n/n8n-nodes-langchain.memoryRedisChat';
	version: 1.1;
	config: NodeConfig<LcMemoryRedisChatV11Params>;
	credentials?: LcMemoryRedisChatV11Credentials;
	isTrigger: true;
};