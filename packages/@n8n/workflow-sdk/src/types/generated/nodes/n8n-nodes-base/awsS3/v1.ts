/**
 * AWS S3 Node - Version 1
 * Sends data to AWS S3
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a bucket */
export type AwsS3V1BucketCreateConfig = {
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
export type AwsS3V1BucketDeleteConfig = {
	resource: 'bucket';
	operation: 'delete';
/**
 * Name of the AWS S3 bucket to delete
 * @displayOptions.show { resource: ["bucket"], operation: ["delete"] }
 */
		name: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V1BucketGetAllConfig = {
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
export type AwsS3V1BucketSearchConfig = {
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
export type AwsS3V1FileCopyConfig = {
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
export type AwsS3V1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	bucketName: string | Expression<string>;
	fileKey: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Download a file */
export type AwsS3V1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	bucketName: string | Expression<string>;
	fileKey: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V1FileGetAllConfig = {
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
export type AwsS3V1FileUploadConfig = {
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
export type AwsS3V1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	bucketName: string | Expression<string>;
	folderName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a bucket */
export type AwsS3V1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	bucketName: string | Expression<string>;
	folderKey: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V1FolderGetAllConfig = {
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

export type AwsS3V1Params =
	| AwsS3V1BucketCreateConfig
	| AwsS3V1BucketDeleteConfig
	| AwsS3V1BucketGetAllConfig
	| AwsS3V1BucketSearchConfig
	| AwsS3V1FileCopyConfig
	| AwsS3V1FileDeleteConfig
	| AwsS3V1FileDownloadConfig
	| AwsS3V1FileGetAllConfig
	| AwsS3V1FileUploadConfig
	| AwsS3V1FolderCreateConfig
	| AwsS3V1FolderDeleteConfig
	| AwsS3V1FolderGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsS3V1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AwsS3V1NodeBase {
	type: 'n8n-nodes-base.awsS3';
	version: 1;
	credentials?: AwsS3V1Credentials;
}

export type AwsS3V1BucketCreateNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1BucketCreateConfig>;
};

export type AwsS3V1BucketDeleteNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1BucketDeleteConfig>;
};

export type AwsS3V1BucketGetAllNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1BucketGetAllConfig>;
};

export type AwsS3V1BucketSearchNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1BucketSearchConfig>;
};

export type AwsS3V1FileCopyNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FileCopyConfig>;
};

export type AwsS3V1FileDeleteNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FileDeleteConfig>;
};

export type AwsS3V1FileDownloadNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FileDownloadConfig>;
};

export type AwsS3V1FileGetAllNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FileGetAllConfig>;
};

export type AwsS3V1FileUploadNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FileUploadConfig>;
};

export type AwsS3V1FolderCreateNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FolderCreateConfig>;
};

export type AwsS3V1FolderDeleteNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FolderDeleteConfig>;
};

export type AwsS3V1FolderGetAllNode = AwsS3V1NodeBase & {
	config: NodeConfig<AwsS3V1FolderGetAllConfig>;
};

export type AwsS3V1Node =
	| AwsS3V1BucketCreateNode
	| AwsS3V1BucketDeleteNode
	| AwsS3V1BucketGetAllNode
	| AwsS3V1BucketSearchNode
	| AwsS3V1FileCopyNode
	| AwsS3V1FileDeleteNode
	| AwsS3V1FileDownloadNode
	| AwsS3V1FileGetAllNode
	| AwsS3V1FileUploadNode
	| AwsS3V1FolderCreateNode
	| AwsS3V1FolderDeleteNode
	| AwsS3V1FolderGetAllNode
	;