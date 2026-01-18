/**
 * Dropbox Node Types
 *
 * Access data on Dropbox
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/dropbox/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Copy a file */
export type DropboxV1FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
	/**
	 * The path of file or folder to copy
	 */
	path: string | Expression<string>;
	/**
	 * The destination path of file or folder
	 */
	toPath: string | Expression<string>;
};

/** Delete a file */
export type DropboxV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	/**
	 * The path to delete. Can be a single file or a whole folder.
	 */
	path: string | Expression<string>;
};

/** Download a file */
export type DropboxV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	/**
	 * The file path of the file to download. Has to contain the full path.
	 */
	path: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Move a file */
export type DropboxV1FileMoveConfig = {
	resource: 'file';
	operation: 'move';
	/**
	 * The path of file or folder to move
	 */
	path: string | Expression<string>;
	/**
	 * The new path of file or folder
	 */
	toPath: string | Expression<string>;
};

/** Upload a file */
export type DropboxV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * The file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.
	 */
	path: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData?: boolean | Expression<boolean>;
	/**
	 * The text content of the file to upload
	 */
	fileContent?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Copy a file */
export type DropboxV1FolderCopyConfig = {
	resource: 'folder';
	operation: 'copy';
	/**
	 * The path of file or folder to copy
	 */
	path: string | Expression<string>;
	/**
	 * The destination path of file or folder
	 */
	toPath: string | Expression<string>;
};

/** Create a folder */
export type DropboxV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	/**
	 * The folder to create. The parent folder has to exist.
	 */
	path: string | Expression<string>;
};

/** Delete a file */
export type DropboxV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	/**
	 * The path to delete. Can be a single file or a whole folder.
	 */
	path: string | Expression<string>;
};

/** Return the files and folders in a given folder */
export type DropboxV1FolderListConfig = {
	resource: 'folder';
	operation: 'list';
	/**
	 * The path of which to list the content
	 */
	path?: string | Expression<string>;
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
	filters?: Record<string, unknown>;
};

/** Move a file */
export type DropboxV1FolderMoveConfig = {
	resource: 'folder';
	operation: 'move';
	/**
	 * The path of file or folder to move
	 */
	path: string | Expression<string>;
	/**
	 * The new path of file or folder
	 */
	toPath: string | Expression<string>;
};

export type DropboxV1SearchQueryConfig = {
	resource: 'search';
	operation: 'query';
	/**
	 * The string to search for. May match across multiple fields based on the request arguments.
	 */
	query: string | Expression<string>;
	/**
	 * The string to search for. May match across multiple fields based on the request arguments.
	 * @default active
	 */
	fileStatus?: 'active' | 'deleted' | Expression<string>;
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
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
};

export type DropboxV1Params =
	| DropboxV1FileCopyConfig
	| DropboxV1FileDeleteConfig
	| DropboxV1FileDownloadConfig
	| DropboxV1FileMoveConfig
	| DropboxV1FileUploadConfig
	| DropboxV1FolderCopyConfig
	| DropboxV1FolderCreateConfig
	| DropboxV1FolderDeleteConfig
	| DropboxV1FolderListConfig
	| DropboxV1FolderMoveConfig
	| DropboxV1SearchQueryConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DropboxV1Credentials {
	dropboxApi: CredentialReference;
	dropboxOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DropboxNode = {
	type: 'n8n-nodes-base.dropbox';
	version: 1;
	config: NodeConfig<DropboxV1Params>;
	credentials?: DropboxV1Credentials;
};
