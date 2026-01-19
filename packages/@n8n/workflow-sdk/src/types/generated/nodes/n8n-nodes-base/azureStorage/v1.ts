/**
 * Azure Storage Node - Version 1
 * Interact with Azure Storage API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["blob"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * The name of the new or existing blob
 * @displayOptions.show { resource: ["blob"], operation: ["create"] }
 */
		blobCreate: string | Expression<string>;
	from: 'binary' | 'url' | Expression<string>;
/**
 * The name of the input binary field containing the file to be written
 * @displayOptions.show { resource: ["blob"], operation: ["create"], from: ["binary"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * URL where to read of the blob contents from
 * @displayOptions.show { resource: ["blob"], operation: ["create"], from: ["url"] }
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
 * @displayOptions.show { resource: ["blob"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Blob to be deleted
 * @displayOptions.show { resource: ["blob"], operation: ["delete"] }
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
 * @displayOptions.show { resource: ["blob"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Blob to get
 * @displayOptions.show { resource: ["blob"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["blob"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		container: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["blob"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["blob"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["container"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["container"], operation: ["delete"] }
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
 * @displayOptions.show { resource: ["container"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["container"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["container"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};


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

interface AzureStorageV1NodeBase {
	type: 'n8n-nodes-base.azureStorage';
	version: 1;
	credentials?: AzureStorageV1Credentials;
}

export type AzureStorageV1BlobCreateNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1BlobCreateConfig>;
};

export type AzureStorageV1BlobDeleteNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1BlobDeleteConfig>;
};

export type AzureStorageV1BlobGetNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1BlobGetConfig>;
};

export type AzureStorageV1BlobGetAllNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1BlobGetAllConfig>;
};

export type AzureStorageV1ContainerCreateNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1ContainerCreateConfig>;
};

export type AzureStorageV1ContainerDeleteNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1ContainerDeleteConfig>;
};

export type AzureStorageV1ContainerGetNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1ContainerGetConfig>;
};

export type AzureStorageV1ContainerGetAllNode = AzureStorageV1NodeBase & {
	config: NodeConfig<AzureStorageV1ContainerGetAllConfig>;
};

export type AzureStorageV1Node =
	| AzureStorageV1BlobCreateNode
	| AzureStorageV1BlobDeleteNode
	| AzureStorageV1BlobGetNode
	| AzureStorageV1BlobGetAllNode
	| AzureStorageV1ContainerCreateNode
	| AzureStorageV1ContainerDeleteNode
	| AzureStorageV1ContainerGetNode
	| AzureStorageV1ContainerGetAllNode
	;