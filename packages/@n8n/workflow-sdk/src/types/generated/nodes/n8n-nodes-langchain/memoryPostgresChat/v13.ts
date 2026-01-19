/**
 * Postgres Chat Memory Node - Version 1.3
 * Stores the chat history in Postgres table.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryPostgresChatV13Params {
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

export interface LcMemoryPostgresChatV13Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryPostgresChatV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryPostgresChat';
	version: 1.3;
	credentials?: LcMemoryPostgresChatV13Credentials;
	isTrigger: true;
}

export type LcMemoryPostgresChatV13ParamsNode = LcMemoryPostgresChatV13NodeBase & {
	config: NodeConfig<LcMemoryPostgresChatV13Params>;
};

export type LcMemoryPostgresChatV13Node = LcMemoryPostgresChatV13ParamsNode;