/**
 * Google Cloud Storage Node - Version 1
 * Use the Google Cloud Storage API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new Bucket */
export type GoogleCloudStorageV1BucketCreateConfig = {
	resource: 'bucket';
	operation: 'create';
	projectId: string | Expression<string>;
	bucketName: string | Expression<string>;
	projection?: 'full' | 'noAcl' | Expression<string>;
	createAcl?: Record<string, unknown>;
	createBody?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an empty Bucket */
export type GoogleCloudStorageV1BucketDeleteConfig = {
	resource: 'bucket';
	operation: 'delete';
	bucketName: string | Expression<string>;
	getFilters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Get metadata for a specific Bucket */
export type GoogleCloudStorageV1BucketGetConfig = {
	resource: 'bucket';
	operation: 'get';
	bucketName: string | Expression<string>;
	projection?: 'full' | 'noAcl' | Expression<string>;
	getFilters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Get list of Buckets */
export type GoogleCloudStorageV1BucketGetAllConfig = {
	resource: 'bucket';
	operation: 'getAll';
	projectId: string | Expression<string>;
	prefix?: string | Expression<string>;
	projection?: 'full' | 'noAcl' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["bucket"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Update the metadata of a bucket */
export type GoogleCloudStorageV1BucketUpdateConfig = {
	resource: 'bucket';
	operation: 'update';
	bucketName: string | Expression<string>;
	projection?: 'full' | 'noAcl' | Expression<string>;
	getFilters?: Record<string, unknown>;
	createAcl?: Record<string, unknown>;
	createBody?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Create a new Bucket */
export type GoogleCloudStorageV1ObjectCreateConfig = {
	resource: 'object';
	operation: 'create';
	bucketName: string | Expression<string>;
	objectName: string | Expression<string>;
	updateProjection?: 'full' | 'noAcl' | Expression<string>;
/**
 * Whether the data for creating a file should come from a binary field
 * @displayOptions.show { resource: ["object"], operation: ["create"] }
 * @default true
 */
		createFromBinary?: boolean | Expression<boolean>;
	createBinaryPropertyName?: string | Expression<string>;
/**
 * Content of the file to be uploaded
 * @displayOptions.show { resource: ["object"], operation: ["create"], createFromBinary: [false] }
 */
		createContent?: string | Expression<string>;
	createData?: Record<string, unknown>;
	createQuery?: Record<string, unknown>;
	encryptionHeaders?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an empty Bucket */
export type GoogleCloudStorageV1ObjectDeleteConfig = {
	resource: 'object';
	operation: 'delete';
	bucketName: string | Expression<string>;
	objectName: string | Expression<string>;
	getParameters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Get metadata for a specific Bucket */
export type GoogleCloudStorageV1ObjectGetConfig = {
	resource: 'object';
	operation: 'get';
	bucketName: string | Expression<string>;
	objectName: string | Expression<string>;
	projection?: 'full' | 'noAcl' | Expression<string>;
	alt?: 'json' | 'media' | Expression<string>;
	binaryPropertyName?: string | Expression<string>;
	getParameters?: Record<string, unknown>;
	encryptionHeaders?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Get list of Buckets */
export type GoogleCloudStorageV1ObjectGetAllConfig = {
	resource: 'object';
	operation: 'getAll';
	bucketName: string | Expression<string>;
	projection?: 'full' | 'noAcl' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["object"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["object"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		maxResults?: number | Expression<number>;
	listFilters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Update the metadata of a bucket */
export type GoogleCloudStorageV1ObjectUpdateConfig = {
	resource: 'object';
	operation: 'update';
	bucketName: string | Expression<string>;
	objectName: string | Expression<string>;
	updateProjection?: 'full' | 'noAcl' | Expression<string>;
	updateData?: Record<string, unknown>;
	metagenAndAclQuery?: Record<string, unknown>;
	encryptionHeaders?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleCloudStorageV1Credentials {
	googleCloudStorageOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleCloudStorageV1NodeBase {
	type: 'n8n-nodes-base.googleCloudStorage';
	version: 1;
	credentials?: GoogleCloudStorageV1Credentials;
}

export type GoogleCloudStorageV1BucketCreateNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1BucketCreateConfig>;
};

export type GoogleCloudStorageV1BucketDeleteNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1BucketDeleteConfig>;
};

export type GoogleCloudStorageV1BucketGetNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1BucketGetConfig>;
};

export type GoogleCloudStorageV1BucketGetAllNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1BucketGetAllConfig>;
};

export type GoogleCloudStorageV1BucketUpdateNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1BucketUpdateConfig>;
};

export type GoogleCloudStorageV1ObjectCreateNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1ObjectCreateConfig>;
};

export type GoogleCloudStorageV1ObjectDeleteNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1ObjectDeleteConfig>;
};

export type GoogleCloudStorageV1ObjectGetNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1ObjectGetConfig>;
};

export type GoogleCloudStorageV1ObjectGetAllNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1ObjectGetAllConfig>;
};

export type GoogleCloudStorageV1ObjectUpdateNode = GoogleCloudStorageV1NodeBase & {
	config: NodeConfig<GoogleCloudStorageV1ObjectUpdateConfig>;
};

export type GoogleCloudStorageV1Node =
	| GoogleCloudStorageV1BucketCreateNode
	| GoogleCloudStorageV1BucketDeleteNode
	| GoogleCloudStorageV1BucketGetNode
	| GoogleCloudStorageV1BucketGetAllNode
	| GoogleCloudStorageV1BucketUpdateNode
	| GoogleCloudStorageV1ObjectCreateNode
	| GoogleCloudStorageV1ObjectDeleteNode
	| GoogleCloudStorageV1ObjectGetNode
	| GoogleCloudStorageV1ObjectGetAllNode
	| GoogleCloudStorageV1ObjectUpdateNode
	;