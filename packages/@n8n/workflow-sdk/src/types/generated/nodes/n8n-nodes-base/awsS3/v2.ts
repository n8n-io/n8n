/**
 * AWS S3 Node - Version 2
 * Sends data to AWS S3
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a bucket */
export type AwsS3V2BucketCreateConfig = {
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
export type AwsS3V2BucketDeleteConfig = {
	resource: 'bucket';
	operation: 'delete';
/**
 * Name of the AWS S3 bucket to delete
 * @displayOptions.show { resource: ["bucket"], operation: ["delete"] }
 */
		name: string | Expression<string>;
};

/** Get many buckets */
export type AwsS3V2BucketGetAllConfig = {
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
export type AwsS3V2BucketSearchConfig = {
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
export type AwsS3V2FileCopyConfig = {
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
export type AwsS3V2FileUploadConfig = {
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
	| AwsS3V2FolderGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsS3V2Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsS3V2Node = {
	type: 'n8n-nodes-base.awsS3';
	version: 2;
	config: NodeConfig<AwsS3V2Params>;
	credentials?: AwsS3V2Credentials;
};