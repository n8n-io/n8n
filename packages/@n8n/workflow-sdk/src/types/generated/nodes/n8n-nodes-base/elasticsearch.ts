/**
 * Elasticsearch Node Types
 *
 * Consume the Elasticsearch API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/elasticsearch/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a document */
export type ElasticsearchV1DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
	/**
	 * ID of the index to add the document to
	 */
	indexId: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataToSend?: 'defineBelow' | 'autoMapInputData' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Delete a document */
export type ElasticsearchV1DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
	/**
	 * ID of the index containing the document to delete
	 */
	indexId: string | Expression<string>;
	/**
	 * ID of the document to delete
	 */
	documentId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get a document */
export type ElasticsearchV1DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
	/**
	 * ID of the index containing the document to retrieve
	 */
	indexId: string | Expression<string>;
	/**
	 * ID of the document to retrieve
	 */
	documentId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Get many documents */
export type ElasticsearchV1DocumentGetAllConfig = {
	resource: 'document';
	operation: 'getAll';
	/**
	 * ID of the index containing the documents to retrieve
	 */
	indexId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Update a document */
export type ElasticsearchV1DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
	/**
	 * ID of the document to update
	 */
	indexId: string | Expression<string>;
	/**
	 * ID of the document to update
	 */
	documentId: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataToSend?: 'defineBelow' | 'autoMapInputData' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create a document */
export type ElasticsearchV1IndexCreateConfig = {
	resource: 'index';
	operation: 'create';
	/**
	 * ID of the index to create
	 */
	indexId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a document */
export type ElasticsearchV1IndexDeleteConfig = {
	resource: 'index';
	operation: 'delete';
	/**
	 * ID of the index to delete
	 */
	indexId: string | Expression<string>;
};

/** Get a document */
export type ElasticsearchV1IndexGetConfig = {
	resource: 'index';
	operation: 'get';
	/**
	 * ID of the index to retrieve
	 */
	indexId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many documents */
export type ElasticsearchV1IndexGetAllConfig = {
	resource: 'index';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

export type ElasticsearchV1Params =
	| ElasticsearchV1DocumentCreateConfig
	| ElasticsearchV1DocumentDeleteConfig
	| ElasticsearchV1DocumentGetConfig
	| ElasticsearchV1DocumentGetAllConfig
	| ElasticsearchV1DocumentUpdateConfig
	| ElasticsearchV1IndexCreateConfig
	| ElasticsearchV1IndexDeleteConfig
	| ElasticsearchV1IndexGetConfig
	| ElasticsearchV1IndexGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ElasticsearchV1Credentials {
	elasticsearchApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ElasticsearchV1Node = {
	type: 'n8n-nodes-base.elasticsearch';
	version: 1;
	config: NodeConfig<ElasticsearchV1Params>;
	credentials?: ElasticsearchV1Credentials;
};

export type ElasticsearchNode = ElasticsearchV1Node;
