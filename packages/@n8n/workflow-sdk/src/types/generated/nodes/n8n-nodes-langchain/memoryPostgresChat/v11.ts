/**
 * Postgres Chat Memory Node - Version 1.1
 * Stores the chat history in Postgres table.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryPostgresChatV11Config {
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

export interface LcMemoryPostgresChatV11Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryPostgresChatV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryPostgresChat';
	version: 1.1;
	credentials?: LcMemoryPostgresChatV11Credentials;
	isTrigger: true;
}

export type LcMemoryPostgresChatV11Node = LcMemoryPostgresChatV11NodeBase & {
	config: NodeConfig<LcMemoryPostgresChatV11Config>;
};

export type LcMemoryPostgresChatV11Node = LcMemoryPostgresChatV11Node;