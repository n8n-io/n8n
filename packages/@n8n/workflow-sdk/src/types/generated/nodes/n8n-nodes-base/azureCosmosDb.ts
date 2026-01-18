/**
 * Azure Cosmos DB Node Types
 *
 * Interact with Azure Cosmos DB API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/azurecosmosdb/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a container */
export type AzureCosmosDbV1ContainerCreateConfig = {
	resource: 'container';
	operation: 'create';
	/**
	 * Unique identifier for the new container
	 */
	containerCreate: string | Expression<string>;
	/**
 * The partition key is used to automatically distribute data across partitions for scalability. Choose a property in your JSON document that has a wide range of values and evenly distributes request volume.
 * @default {
	"paths": [
		"/id"
	],
	"kind": "Hash",
	"version": 2
}
 */
	partitionKey: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a container */
export type AzureCosmosDbV1ContainerDeleteConfig = {
	resource: 'container';
	operation: 'delete';
	/**
	 * Select the container you want to delete
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a container */
export type AzureCosmosDbV1ContainerGetConfig = {
	resource: 'container';
	operation: 'get';
	/**
	 * Select the container you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of containers */
export type AzureCosmosDbV1ContainerGetAllConfig = {
	resource: 'container';
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Create a container */
export type AzureCosmosDbV1ItemCreateConfig = {
	resource: 'item';
	operation: 'create';
	/**
	 * Select the container you want to use
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
 * The item contents as a JSON object
 * @default {
	"id": "replace_with_new_document_id"
}
 */
	customProperties: IDataObject | string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a container */
export type AzureCosmosDbV1ItemDeleteConfig = {
	resource: 'item';
	operation: 'delete';
	/**
	 * Select the container you want to use
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * Select the item to be deleted
	 * @default {"mode":"list","value":""}
	 */
	item: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a container */
export type AzureCosmosDbV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
	/**
	 * Select the container you want to use
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * Select the item you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	item: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of containers */
export type AzureCosmosDbV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
	/**
	 * Select the container you want to use
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
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
	requestOptions?: Record<string, unknown>;
};

export type AzureCosmosDbV1ItemQueryConfig = {
	resource: 'item';
	operation: 'query';
	/**
	 * Select the container you want to use
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * The SQL query to execute. Use $1, $2, $3, etc., to reference the 'Query Parameters' set in the options below.
	 */
	query: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Update an existing item */
export type AzureCosmosDbV1ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
	/**
	 * Select the container you want to use
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * Select the item to be updated
	 * @default {"mode":"list","value":""}
	 */
	item: ResourceLocatorValue;
	/**
	 * The item contents as a JSON object
	 * @default {}
	 */
	customProperties: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type AzureCosmosDbV1Params =
	| AzureCosmosDbV1ContainerCreateConfig
	| AzureCosmosDbV1ContainerDeleteConfig
	| AzureCosmosDbV1ContainerGetConfig
	| AzureCosmosDbV1ContainerGetAllConfig
	| AzureCosmosDbV1ItemCreateConfig
	| AzureCosmosDbV1ItemDeleteConfig
	| AzureCosmosDbV1ItemGetConfig
	| AzureCosmosDbV1ItemGetAllConfig
	| AzureCosmosDbV1ItemQueryConfig
	| AzureCosmosDbV1ItemUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AzureCosmosDbV1Credentials {
	microsoftAzureCosmosDbSharedKeyApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AzureCosmosDbNode = {
	type: 'n8n-nodes-base.azureCosmosDb';
	version: 1;
	config: NodeConfig<AzureCosmosDbV1Params>;
	credentials?: AzureCosmosDbV1Credentials;
};
