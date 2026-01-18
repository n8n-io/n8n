/**
 * Google Cloud Firestore Node Types
 *
 * Interact with Google Firebase - Cloud Firestore API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlefirebasecloudfirestore/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a document */
export type GoogleFirebaseCloudFirestoreV11DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * Collection name
	 */
	collection: string | Expression<string>;
	documentId?: string | Expression<string>;
	/**
	 * List of attributes to save
	 */
	columns: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Create a new document, or update the current one if it already exists (upsert) */
export type GoogleFirebaseCloudFirestoreV11DocumentUpsertConfig = {
	resource: 'document';
	operation: 'upsert';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * Collection name
	 */
	collection: string | Expression<string>;
	/**
	 * Name of the field in an input item that contains the document ID
	 */
	updateKey: string | Expression<string>;
	/**
	 * Columns to insert
	 */
	columns: string | Expression<string>;
};

/** Delete a document */
export type GoogleFirebaseCloudFirestoreV11DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * Collection name
	 */
	collection: string | Expression<string>;
	documentId: string | Expression<string>;
};

/** Get a document */
export type GoogleFirebaseCloudFirestoreV11DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * Collection name
	 */
	collection: string | Expression<string>;
	documentId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get many documents from a collection */
export type GoogleFirebaseCloudFirestoreV11DocumentGetAllConfig = {
	resource: 'document';
	operation: 'getAll';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * Collection name
	 */
	collection: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Runs a query against your documents */
export type GoogleFirebaseCloudFirestoreV11DocumentQueryConfig = {
	resource: 'document';
	operation: 'query';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * JSON query to execute
	 */
	query: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
};

/** Get many documents from a collection */
export type GoogleFirebaseCloudFirestoreV11CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Usually the provided default value will work
	 * @default (default)
	 */
	database: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type GoogleFirebaseCloudFirestoreV11Params =
	| GoogleFirebaseCloudFirestoreV11DocumentCreateConfig
	| GoogleFirebaseCloudFirestoreV11DocumentUpsertConfig
	| GoogleFirebaseCloudFirestoreV11DocumentDeleteConfig
	| GoogleFirebaseCloudFirestoreV11DocumentGetConfig
	| GoogleFirebaseCloudFirestoreV11DocumentGetAllConfig
	| GoogleFirebaseCloudFirestoreV11DocumentQueryConfig
	| GoogleFirebaseCloudFirestoreV11CollectionGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleFirebaseCloudFirestoreV11Credentials {
	googleFirebaseCloudFirestoreOAuth2Api: CredentialReference;
	googleApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleFirebaseCloudFirestoreV11Node = {
	type: 'n8n-nodes-base.googleFirebaseCloudFirestore';
	version: 1 | 1.1;
	config: NodeConfig<GoogleFirebaseCloudFirestoreV11Params>;
	credentials?: GoogleFirebaseCloudFirestoreV11Credentials;
};

export type GoogleFirebaseCloudFirestoreNode = GoogleFirebaseCloudFirestoreV11Node;
