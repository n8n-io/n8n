/**
 * Postgres Chat Memory Node - Version 1.3
 * Stores the chat history in Postgres table.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryPostgresChatV13Params {
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
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
// Node Type
// ===========================================================================

export type LcMemoryPostgresChatV13Node = {
	type: '@n8n/n8n-nodes-langchain.memoryPostgresChat';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcMemoryPostgresChatV13Params>;
	credentials?: LcMemoryPostgresChatV13Credentials;
	isTrigger: true;
};