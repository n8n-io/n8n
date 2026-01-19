/**
 * Google Cloud Firestore Node - Version 1
 * Interact with Google Firebase - Cloud Firestore API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a document */
export type GoogleFirebaseCloudFirestoreV1DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["create"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["document"], operation: ["create"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * Collection name
 * @displayOptions.show { resource: ["document"], operation: ["create"] }
 */
		collection: string | Expression<string>;
	documentId?: string | Expression<string>;
/**
 * List of attributes to save
 * @displayOptions.show { resource: ["document"], operation: ["create"] }
 */
		columns: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["create"], resource: ["document"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Create a new document, or update the current one if it already exists (upsert) */
export type GoogleFirebaseCloudFirestoreV1DocumentUpsertConfig = {
	resource: 'document';
	operation: 'upsert';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["upsert"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["document"], operation: ["upsert"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * Collection name
 * @displayOptions.show { resource: ["document"], operation: ["upsert"] }
 */
		collection: string | Expression<string>;
/**
 * Name of the field in an input item that contains the document ID
 * @displayOptions.show { resource: ["document"], operation: ["upsert"] }
 */
		updateKey: string | Expression<string>;
/**
 * Columns to insert
 * @displayOptions.show { resource: ["document"], operation: ["upsert"] }
 */
		columns: string | Expression<string>;
};

/** Delete a document */
export type GoogleFirebaseCloudFirestoreV1DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["delete"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["document"], operation: ["delete"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * Collection name
 * @displayOptions.show { resource: ["document"], operation: ["delete"] }
 */
		collection: string | Expression<string>;
	documentId: string | Expression<string>;
};

/** Get a document */
export type GoogleFirebaseCloudFirestoreV1DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["get"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["document"], operation: ["get"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * Collection name
 * @displayOptions.show { resource: ["document"], operation: ["get"] }
 */
		collection: string | Expression<string>;
	documentId: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["get"], resource: ["document"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Get many documents from a collection */
export type GoogleFirebaseCloudFirestoreV1DocumentGetAllConfig = {
	resource: 'document';
	operation: 'getAll';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["getAll"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["document"], operation: ["getAll"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * Collection name
 * @displayOptions.show { resource: ["document"], operation: ["getAll"] }
 */
		collection: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["document"], operation: ["getAll"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["document"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["document"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Runs a query against your documents */
export type GoogleFirebaseCloudFirestoreV1DocumentQueryConfig = {
	resource: 'document';
	operation: 'query';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["query"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["document"], operation: ["query"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * JSON query to execute
 * @displayOptions.show { resource: ["document"], operation: ["query"] }
 */
		query: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["query"], resource: ["document"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Get many documents from a collection */
export type GoogleFirebaseCloudFirestoreV1CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"] }
 */
		projectId: string | Expression<string>;
/**
 * Usually the provided default value will work
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"] }
 * @default (default)
 */
		database: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"] }
 * @default false
 */
		returnAll: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleFirebaseCloudFirestoreV1Credentials {
	googleFirebaseCloudFirestoreOAuth2Api: CredentialReference;
	googleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleFirebaseCloudFirestoreV1NodeBase {
	type: 'n8n-nodes-base.googleFirebaseCloudFirestore';
	version: 1;
	credentials?: GoogleFirebaseCloudFirestoreV1Credentials;
}

export type GoogleFirebaseCloudFirestoreV1DocumentCreateNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1DocumentCreateConfig>;
};

export type GoogleFirebaseCloudFirestoreV1DocumentUpsertNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1DocumentUpsertConfig>;
};

export type GoogleFirebaseCloudFirestoreV1DocumentDeleteNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1DocumentDeleteConfig>;
};

export type GoogleFirebaseCloudFirestoreV1DocumentGetNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1DocumentGetConfig>;
};

export type GoogleFirebaseCloudFirestoreV1DocumentGetAllNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1DocumentGetAllConfig>;
};

export type GoogleFirebaseCloudFirestoreV1DocumentQueryNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1DocumentQueryConfig>;
};

export type GoogleFirebaseCloudFirestoreV1CollectionGetAllNode = GoogleFirebaseCloudFirestoreV1NodeBase & {
	config: NodeConfig<GoogleFirebaseCloudFirestoreV1CollectionGetAllConfig>;
};

export type GoogleFirebaseCloudFirestoreV1Node =
	| GoogleFirebaseCloudFirestoreV1DocumentCreateNode
	| GoogleFirebaseCloudFirestoreV1DocumentUpsertNode
	| GoogleFirebaseCloudFirestoreV1DocumentDeleteNode
	| GoogleFirebaseCloudFirestoreV1DocumentGetNode
	| GoogleFirebaseCloudFirestoreV1DocumentGetAllNode
	| GoogleFirebaseCloudFirestoreV1DocumentQueryNode
	| GoogleFirebaseCloudFirestoreV1CollectionGetAllNode
	;