/**
 * MongoDB Chat Memory Node - Version 1
 * Stores the chat history in MongoDB collection.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMemoryMongoDbChatV1Config {
	sessionIdType?: 'fromInput' | 'customKey' | Expression<string>;
/**
 * The key to use to store session ID in the memory
 * @displayOptions.show { sessionIdType: ["customKey"] }
 */
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
// Node Types
// ===========================================================================

interface LcMemoryMongoDbChatV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryMongoDbChat';
	version: 1;
	credentials?: LcMemoryMongoDbChatV1Credentials;
	isTrigger: true;
}

export type LcMemoryMongoDbChatV1Node = LcMemoryMongoDbChatV1NodeBase & {
	config: NodeConfig<LcMemoryMongoDbChatV1Config>;
};

export type LcMemoryMongoDbChatV1Node = LcMemoryMongoDbChatV1Node;