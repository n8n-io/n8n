/**
 * S3 Node - Version 1
 * Sends data to any S3-compatible service
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a bucket */
export type S3V1BucketCreateConfig = {
	resource: 'bucket';
	operation: 'create';
/**
 * A succinct description of the nature, symptoms, cause, or effect of the bucket
 * @displayOptions.show { resource: ["bucket"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a bucket */
export type S3V1BucketDeleteConfig = {
	resource: 'bucket';
	operation: 'delete';
/**
 * Name of the AWS S3 bucket to delete
 * @displayOptions.show { resource: ["bucket"], operation: ["delete"] }
 */
		name: string | Expression<string>;
};

/** Get many buckets */
export type S3V1BucketGetAllConfig = {
	resource: 'bucket';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["bucket"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["bucket"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Search within a bucket */
export type S3V1BucketSearchConfig = {
	resource: 'bucket';
	operation: 'search';
	bucketName: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["search"], resource: ["bucket"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["search"], resource: ["bucket"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Copy a file */
export type S3V1FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
/**
 * The name of the source bucket should start with (/) and key name of the source object, separated by a slash (/)
 * @displayOptions.show { resource: ["file"], operation: ["copy"] }
 */
		sourcePath: string | Expression<string>;
/**
 * The name of the destination bucket and key name of the destination object, separated by a slash (/)
 * @displayOptions.show { resource: ["file"], operation: ["copy"] }
 */
		destinationPath: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a bucket */
export type S3V1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	bucketName: string | Expression<string>;
	fileKey: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Download a file */
export type S3V1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	bucketName: string | Expression<string>;
	fileKey: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get many buckets */
export type S3V1FileGetAllConfig = {
	resource: 'file';
	operation: 'getAll';
	bucketName: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["file"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["file"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Upload a file */
export type S3V1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	bucketName: string | Expression<string>;
	fileName: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default true
 */
		binaryData?: boolean | Expression<boolean>;
/**
 * The text content of the file to upload
 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [false] }
 */
		fileContent?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * Optional extra headers to add to the message (most headers are allowed)
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default {}
 */
		tagsUi?: {
		tagsValues?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Create a bucket */
export type S3V1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	bucketName: string | Expression<string>;
	folderName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a bucket */
export type S3V1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	bucketName: string | Expression<string>;
	folderKey: string | Expression<string>;
};

/** Get many buckets */
export type S3V1FolderGetAllConfig = {
	resource: 'folder';
	operation: 'getAll';
	bucketName: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["folder"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["folder"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type S3V1BucketCreateOutput = {
	success?: boolean;
};

export type S3V1BucketGetAllOutput = {
	CreationDate?: string;
	Name?: string;
};

export type S3V1BucketSearchOutput = {
	ETag?: string;
	Key?: string;
	LastModified?: string;
	Size?: string;
	StorageClass?: string;
};

export type S3V1FileDeleteOutput = {
	success?: boolean;
};

export type S3V1FileDownloadOutput = {
	ETag?: string;
	Key?: string;
	LastModified?: string;
	Size?: string;
	StorageClass?: string;
};

export type S3V1FileGetAllOutput = {
	ETag?: string;
	Key?: string;
	LastModified?: string;
	Size?: string;
	StorageClass?: string;
};

export type S3V1FileUploadOutput = {
	success?: boolean;
};

export type S3V1FolderCreateOutput = {
	success?: boolean;
};

export type S3V1FolderGetAllOutput = {
	ETag?: string;
	Key?: string;
	LastModified?: string;
	Size?: string;
	StorageClass?: string;
	Type?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface S3V1Credentials {
	s3: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface S3V1NodeBase {
	type: 'n8n-nodes-base.s3';
	version: 1;
	credentials?: S3V1Credentials;
}

export type S3V1BucketCreateNode = S3V1NodeBase & {
	config: NodeConfig<S3V1BucketCreateConfig>;
	output?: S3V1BucketCreateOutput;
};

export type S3V1BucketDeleteNode = S3V1NodeBase & {
	config: NodeConfig<S3V1BucketDeleteConfig>;
};

export type S3V1BucketGetAllNode = S3V1NodeBase & {
	config: NodeConfig<S3V1BucketGetAllConfig>;
	output?: S3V1BucketGetAllOutput;
};

export type S3V1BucketSearchNode = S3V1NodeBase & {
	config: NodeConfig<S3V1BucketSearchConfig>;
	output?: S3V1BucketSearchOutput;
};

export type S3V1FileCopyNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FileCopyConfig>;
};

export type S3V1FileDeleteNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FileDeleteConfig>;
	output?: S3V1FileDeleteOutput;
};

export type S3V1FileDownloadNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FileDownloadConfig>;
	output?: S3V1FileDownloadOutput;
};

export type S3V1FileGetAllNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FileGetAllConfig>;
	output?: S3V1FileGetAllOutput;
};

export type S3V1FileUploadNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FileUploadConfig>;
	output?: S3V1FileUploadOutput;
};

export type S3V1FolderCreateNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FolderCreateConfig>;
	output?: S3V1FolderCreateOutput;
};

export type S3V1FolderDeleteNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FolderDeleteConfig>;
};

export type S3V1FolderGetAllNode = S3V1NodeBase & {
	config: NodeConfig<S3V1FolderGetAllConfig>;
	output?: S3V1FolderGetAllOutput;
};

export type S3V1Node =
	| S3V1BucketCreateNode
	| S3V1BucketDeleteNode
	| S3V1BucketGetAllNode
	| S3V1BucketSearchNode
	| S3V1FileCopyNode
	| S3V1FileDeleteNode
	| S3V1FileDownloadNode
	| S3V1FileGetAllNode
	| S3V1FileUploadNode
	| S3V1FolderCreateNode
	| S3V1FolderDeleteNode
	| S3V1FolderGetAllNode
	;