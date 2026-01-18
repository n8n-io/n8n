/**
 * S3 Node Types
 *
 * Sends data to any S3-compatible service
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/s3/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a bucket */
export type S3V1BucketCreateConfig = {
	resource: 'bucket';
	operation: 'create';
	/**
	 * A succinct description of the nature, symptoms, cause, or effect of the bucket
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
	 */
	name: string | Expression<string>;
};

/** Get many buckets */
export type S3V1BucketGetAllConfig = {
	resource: 'bucket';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	sourcePath: string | Expression<string>;
	/**
	 * The name of the destination bucket and key name of the destination object, separated by a slash (/)
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default true
	 */
	binaryData?: boolean | Expression<boolean>;
	/**
	 * The text content of the file to upload
	 */
	fileContent?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Optional extra headers to add to the message (most headers are allowed)
	 * @default {}
	 */
	tagsUi?: Record<string, unknown>;
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type S3V1Params =
	| S3V1BucketCreateConfig
	| S3V1BucketDeleteConfig
	| S3V1BucketGetAllConfig
	| S3V1BucketSearchConfig
	| S3V1FileCopyConfig
	| S3V1FileDeleteConfig
	| S3V1FileDownloadConfig
	| S3V1FileGetAllConfig
	| S3V1FileUploadConfig
	| S3V1FolderCreateConfig
	| S3V1FolderDeleteConfig
	| S3V1FolderGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface S3V1Credentials {
	s3: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type S3V1Node = {
	type: 'n8n-nodes-base.s3';
	version: 1;
	config: NodeConfig<S3V1Params>;
	credentials?: S3V1Credentials;
};

export type S3Node = S3V1Node;
