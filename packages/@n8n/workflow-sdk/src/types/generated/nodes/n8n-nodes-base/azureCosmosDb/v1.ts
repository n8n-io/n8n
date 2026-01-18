/**
 * Azure Cosmos DB Node - Version 1
 * Interact with Azure Cosmos DB API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

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
 * @displayOptions.show { resource: ["container"], operation: ["create"] }
 */
		containerCreate: string | Expression<string>;
/**
 * The partition key is used to automatically distribute data across partitions for scalability. Choose a property in your JSON document that has a wide range of values and evenly distributes request volume.
 * @displayOptions.show { resource: ["container"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["container"], operation: ["delete"] }
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
 * @displayOptions.show { resource: ["container"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["container"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["container"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["container"], operation: ["getAll"] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["container"], operation: ["getAll"] }
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
 * @displayOptions.show { resource: ["item"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * The item contents as a JSON object
 * @hint The item requires an ID and partition key value if a custom key is set
 * @displayOptions.show { resource: ["item"], operation: ["create"] }
 * @displayOptions.hide { container: [""] }
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
 * @displayOptions.show { resource: ["item"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Select the item to be deleted
 * @displayOptions.show { resource: ["item"], operation: ["delete"] }
 * @displayOptions.hide { container: [""] }
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
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Select the item you want to retrieve
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 * @displayOptions.hide { container: [""] }
 * @default {"mode":"list","value":""}
 */
		item: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 * @displayOptions.hide { container: [""], item: [""] }
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
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["item"], operation: ["getAll"] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
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
 * @displayOptions.show { resource: ["item"], operation: ["query"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * The SQL query to execute. Use $1, $2, $3, etc., to reference the 'Query Parameters' set in the options below.
 * @hint Consider using query parameters to prevent SQL injection attacks. Add them in the options below.
 * @displayOptions.show { resource: ["item"], operation: ["query"] }
 */
		query: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["item"], operation: ["query"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	options?: {
		queryOptions?: {
			/** Comma-separated list of values used as query parameters. Use $1, $2, $3, etc., in your query.
			 * @hint Reference them in your query as $1, $2, $3…
			 */
			queryParameters?: string | Expression<string>;
		};
	};
	requestOptions?: Record<string, unknown>;
};

/** Update an existing item */
export type AzureCosmosDbV1ItemUpdateConfig = {
	resource: 'item';
	operation: 'update';
/**
 * Select the container you want to use
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Select the item to be updated
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 * @displayOptions.hide { container: [""] }
 * @default {"mode":"list","value":""}
 */
		item: ResourceLocatorValue;
/**
 * The item contents as a JSON object
 * @displayOptions.show { resource: ["item"], operation: ["update"] }
 * @displayOptions.hide { container: [""], item: [""] }
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
	| AzureCosmosDbV1ItemUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AzureCosmosDbV1Credentials {
	microsoftAzureCosmosDbSharedKeyApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AzureCosmosDbV1Node = {
	type: 'n8n-nodes-base.azureCosmosDb';
	version: 1;
	config: NodeConfig<AzureCosmosDbV1Params>;
	credentials?: AzureCosmosDbV1Credentials;
};