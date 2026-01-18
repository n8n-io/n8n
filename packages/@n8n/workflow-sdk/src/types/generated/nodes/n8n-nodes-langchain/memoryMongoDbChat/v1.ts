/**
 * MongoDB Chat Memory Node - Version 1
 * Stores the chat history in MongoDB collection.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMongoDbChatV1Params {
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
	sessionKey?: string | Expression<string>;
/**
 * The collection name to store the chat history in. If collection does not exist, it will be created.
 * @default n8n_chat_histories
 */
		collectionName?: string | Expression<string>;
/**
 * The database name to store the chat history in. If not provided, the database from credentials will be used.
 */
		databaseName?: string | Expression<string>;
	contextWindowLength?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMemoryMongoDbChatV1Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMemoryMongoDbChatV1Node = {
	type: '@n8n/n8n-nodes-langchain.memoryMongoDbChat';
	version: 1;
	config: NodeConfig<LcMemoryMongoDbChatV1Params>;
	credentials?: LcMemoryMongoDbChatV1Credentials;
	isTrigger: true;
};