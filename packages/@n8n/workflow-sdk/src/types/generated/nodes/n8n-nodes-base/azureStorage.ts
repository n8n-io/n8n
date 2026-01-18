/**
 * Azure Storage Node Types
 *
 * Interact with Azure Storage API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/azurestorage/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new blob or replace an existing one */
export type AzureStorageV1BlobCreateConfig = {
	resource: 'blob';
	operation: 'create';
	/**
	 * Container to create or replace a blob in
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * The name of the new or existing blob
	 */
	blobCreate: string | Expression<string>;
	from: 'binary' | 'url' | Expression<string>;
	/**
	 * The name of the input binary field containing the file to be written
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * URL where to read of the blob contents from
	 */
	url: string | Expression<string>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a blob */
export type AzureStorageV1BlobDeleteConfig = {
	resource: 'blob';
	operation: 'delete';
	/**
	 * Container to delete a blob from
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * Blob to be deleted
	 * @default {"mode":"list","value":""}
	 */
	blob: ResourceLocatorValue;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve data for a specific blob */
export type AzureStorageV1BlobGetConfig = {
	resource: 'blob';
	operation: 'get';
	/**
	 * Container to get a blob from
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	/**
	 * Blob to get
	 * @default {"mode":"list","value":""}
	 */
	blob: ResourceLocatorValue;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of blobs */
export type AzureStorageV1BlobGetAllConfig = {
	resource: 'blob';
	operation: 'getAll';
	/**
	 * Container to get blobs from
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
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Create a new blob or replace an existing one */
export type AzureStorageV1ContainerCreateConfig = {
	resource: 'container';
	operation: 'create';
	/**
	 * The name of the new container
	 */
	containerCreate: string | Expression<string>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a blob */
export type AzureStorageV1ContainerDeleteConfig = {
	resource: 'container';
	operation: 'delete';
	/**
	 * Select the container to delete
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve data for a specific blob */
export type AzureStorageV1ContainerGetConfig = {
	resource: 'container';
	operation: 'get';
	/**
	 * Select the container to get
	 * @default {"mode":"list","value":""}
	 */
	container: ResourceLocatorValue;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of blobs */
export type AzureStorageV1ContainerGetAllConfig = {
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
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type AzureStorageV1Params =
	| AzureStorageV1BlobCreateConfig
	| AzureStorageV1BlobDeleteConfig
	| AzureStorageV1BlobGetConfig
	| AzureStorageV1BlobGetAllConfig
	| AzureStorageV1ContainerCreateConfig
	| AzureStorageV1ContainerDeleteConfig
	| AzureStorageV1ContainerGetConfig
	| AzureStorageV1ContainerGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AzureStorageV1Credentials {
	azureStorageOAuth2Api: CredentialReference;
	azureStorageSharedKeyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AzureStorageV1Node = {
	type: 'n8n-nodes-base.azureStorage';
	version: 1;
	config: NodeConfig<AzureStorageV1Params>;
	credentials?: AzureStorageV1Credentials;
};

export type AzureStorageNode = AzureStorageV1Node;
