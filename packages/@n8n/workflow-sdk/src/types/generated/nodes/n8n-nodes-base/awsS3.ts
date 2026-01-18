/**
 * AWS S3 Node Types
 *
 * Sends data to AWS S3
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awss3/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a bucket */
export type AwsS3V2BucketCreateConfig = {
	resource: 'bucket';
	operation: 'create';
	/**
	 * A succinct description of the nature, symptoms, cause, or effect of the bucket
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a bucket */
export type AwsS3V2BucketDeleteConfig = {
	resource: 'bucket';
	operation: 'delete';
	/**
	 * Name of the AWS S3 bucket to delete
	 */
	name: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V2BucketGetAllConfig = {
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
export type AwsS3V2BucketSearchConfig = {
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
export type AwsS3V2FileCopyConfig = {
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
export type AwsS3V2FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	bucketName: string | Expression<string>;
	fileKey: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Download a file */
export type AwsS3V2FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	bucketName: string | Expression<string>;
	fileKey: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V2FileGetAllConfig = {
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
export type AwsS3V2FileUploadConfig = {
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
	tagsUi?: {
		tagsValues?: Array<{ key?: string | Expression<string>; value?: string | Expression<string> }>;
	};
};

/** Create a bucket */
export type AwsS3V2FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	bucketName: string | Expression<string>;
	folderName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a bucket */
export type AwsS3V2FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	bucketName: string | Expression<string>;
	folderKey: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V2FolderGetAllConfig = {
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

export type AwsS3V2Params =
	| AwsS3V2BucketCreateConfig
	| AwsS3V2BucketDeleteConfig
	| AwsS3V2BucketGetAllConfig
	| AwsS3V2BucketSearchConfig
	| AwsS3V2FileCopyConfig
	| AwsS3V2FileDeleteConfig
	| AwsS3V2FileDownloadConfig
	| AwsS3V2FileGetAllConfig
	| AwsS3V2FileUploadConfig
	| AwsS3V2FolderCreateConfig
	| AwsS3V2FolderDeleteConfig
	| AwsS3V2FolderGetAllConfig;

/** Create a bucket */
export type AwsS3V1BucketCreateConfig = {
	resource: 'bucket';
	operation: 'create';
	/**
	 * A succinct description of the nature, symptoms, cause, or effect of the bucket
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
	 */
	name: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V1BucketGetAllConfig = {
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
export type AwsS3V1BucketSearchConfig = {
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
export type AwsS3V1FileCopyConfig = {
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
export type AwsS3V1FileUploadConfig = {
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
	tagsUi?: {
		tagsValues?: Array<{ key?: string | Expression<string>; value?: string | Expression<string> }>;
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
	| AwsS3V1FolderGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsS3V2Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

export interface AwsS3V1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AwsS3V2Node = {
	type: 'n8n-nodes-base.awsS3';
	version: 2;
	config: NodeConfig<AwsS3V2Params>;
	credentials?: AwsS3V2Credentials;
};

export type AwsS3V1Node = {
	type: 'n8n-nodes-base.awsS3';
	version: 1;
	config: NodeConfig<AwsS3V1Params>;
	credentials?: AwsS3V1Credentials;
};

export type AwsS3Node = AwsS3V2Node | AwsS3V1Node;
