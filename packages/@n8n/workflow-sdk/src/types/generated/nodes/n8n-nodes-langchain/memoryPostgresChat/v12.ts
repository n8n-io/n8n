/**
 * Postgres Chat Memory Node - Version 1.2
 * Stores the chat history in Postgres table.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryPostgresChatV12Config {
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
		sessionKey?: string | Expression<string>;
/**
 * The table name to store the chat history in. If table does not exist, it will be created.
 * @default n8n_chat_histories
 */
		tableName?: string | Expression<string>;
	contextWindowLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryPostgresChatV12Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryPostgresChatV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryPostgresChat';
	version: 1.2;
	credentials?: LcMemoryPostgresChatV12Credentials;
	isTrigger: true;
}

export type LcMemoryPostgresChatV12Node = LcMemoryPostgresChatV12NodeBase & {
	config: NodeConfig<LcMemoryPostgresChatV12Config>;
};

export type LcMemoryPostgresChatV12Node = LcMemoryPostgresChatV12Node;