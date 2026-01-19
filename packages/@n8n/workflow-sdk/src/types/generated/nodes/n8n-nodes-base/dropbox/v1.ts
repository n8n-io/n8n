/**
 * Dropbox Node - Version 1
 * Access data on Dropbox
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Copy a file */
export type DropboxV1FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
/**
 * The path of file or folder to copy
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The destination path of file or folder
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Delete a file */
export type DropboxV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * The path to delete. Can be a single file or a whole folder.
 * @displayOptions.show { operation: ["delete"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
};

/** Download a file */
export type DropboxV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
/**
 * The file path of the file to download. Has to contain the full path.
 * @displayOptions.show { operation: ["download"], resource: ["file"] }
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
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The new path of file or folder
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Upload a file */
export type DropboxV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * The file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		path: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default false
 */
		binaryData?: boolean | Expression<boolean>;
/**
 * The text content of the file to upload
 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [false] }
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
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The destination path of file or folder
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Create a folder */
export type DropboxV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * The folder to create. The parent folder has to exist.
 * @displayOptions.show { operation: ["create"], resource: ["folder"] }
 */
		path: string | Expression<string>;
};

/** Delete a file */
export type DropboxV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
/**
 * The path to delete. Can be a single file or a whole folder.
 * @displayOptions.show { operation: ["delete"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
};

/** Return the files and folders in a given folder */
export type DropboxV1FolderListConfig = {
	resource: 'folder';
	operation: 'list';
/**
 * The path of which to list the content
 * @displayOptions.show { operation: ["list"], resource: ["folder"] }
 */
		path?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["list"], resource: ["folder"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["folder"], operation: ["list"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The new path of file or folder
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

export type DropboxV1SearchQueryConfig = {
	resource: 'search';
	operation: 'query';
/**
 * The string to search for. May match across multiple fields based on the request arguments.
 * @displayOptions.show { operation: ["query"], resource: ["search"] }
 */
		query: string | Expression<string>;
/**
 * The string to search for. May match across multiple fields based on the request arguments.
 * @displayOptions.show { operation: ["query"], resource: ["search"] }
 * @default active
 */
		fileStatus?: 'active' | 'deleted' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["query"], resource: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["search"], operation: ["query"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["query"], resource: ["search"] }
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
	| DropboxV1SearchQueryConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type DropboxV1FileCopyOutput = {
	metadata?: {
		'.tag'?: string;
		client_modified?: string;
		content_hash?: string;
		id?: string;
		is_downloadable?: boolean;
		name?: string;
		parent_shared_folder_id?: string;
		path_display?: string;
		path_lower?: string;
		rev?: string;
		server_modified?: string;
		sharing_info?: {
			modified_by?: string;
			parent_shared_folder_id?: string;
			read_only?: boolean;
		};
		size?: number;
	};
};

export type DropboxV1FileDeleteOutput = {
	metadata?: {
		'.tag'?: string;
		client_modified?: string;
		content_hash?: string;
		id?: string;
		is_downloadable?: boolean;
		name?: string;
		path_display?: string;
		path_lower?: string;
		rev?: string;
		server_modified?: string;
		size?: number;
	};
};

export type DropboxV1FileDownloadOutput = {
	contentHash?: string;
	contentSize?: number;
	id?: string;
	isDownloadable?: boolean;
	lastModifiedClient?: string;
	lastModifiedServer?: string;
	name?: string;
	pathDisplay?: string;
	pathLower?: string;
	rev?: string;
	type?: string;
};

export type DropboxV1FileMoveOutput = {
	metadata?: {
		'.tag'?: string;
		client_modified?: string;
		content_hash?: string;
		id?: string;
		is_downloadable?: boolean;
		name?: string;
		path_display?: string;
		path_lower?: string;
		rev?: string;
		server_modified?: string;
		size?: number;
	};
};

export type DropboxV1FileUploadOutput = {
	client_modified?: string;
	content_hash?: string;
	id?: string;
	is_downloadable?: boolean;
	name?: string;
	path_display?: string;
	path_lower?: string;
	rev?: string;
	server_modified?: string;
	size?: number;
};

export type DropboxV1FolderCreateOutput = {
	metadata?: {
		id?: string;
		name?: string;
		path_display?: string;
		path_lower?: string;
	};
};

export type DropboxV1FolderDeleteOutput = {
	metadata?: {
		'.tag'?: string;
		id?: string;
		name?: string;
		path_display?: string;
		path_lower?: string;
	};
};

export type DropboxV1FolderListOutput = {
	contentHash?: string;
	contentSize?: number;
	id?: string;
	isDownloadable?: boolean;
	lastModifiedClient?: string;
	lastModifiedServer?: string;
	name?: string;
	pathDisplay?: string;
	pathLower?: string;
	rev?: string;
	type?: string;
};

export type DropboxV1FolderMoveOutput = {
	metadata?: {
		'.tag'?: string;
		id?: string;
		name?: string;
		parent_shared_folder_id?: string;
		path_display?: string;
		path_lower?: string;
		sharing_info?: {
			no_access?: boolean;
			parent_shared_folder_id?: string;
			read_only?: boolean;
			traverse_only?: boolean;
		};
	};
};

export type DropboxV1SearchQueryOutput = {
	'.tag'?: string;
	client_modified?: string;
	content_hash?: string;
	file_owner_team_encrypted_id?: string;
	id?: string;
	is_downloadable?: boolean;
	name?: string;
	path_display?: string;
	path_lower?: string;
	rev?: string;
	server_modified?: string;
	sharing_info?: {
		modified_by?: string;
		parent_shared_folder_id?: string;
		read_only?: boolean;
	};
	size?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface DropboxV1Credentials {
	dropboxApi: CredentialReference;
	dropboxOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface DropboxV1NodeBase {
	type: 'n8n-nodes-base.dropbox';
	version: 1;
	credentials?: DropboxV1Credentials;
}

export type DropboxV1FileCopyNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FileCopyConfig>;
	output?: DropboxV1FileCopyOutput;
};

export type DropboxV1FileDeleteNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FileDeleteConfig>;
	output?: DropboxV1FileDeleteOutput;
};

export type DropboxV1FileDownloadNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FileDownloadConfig>;
	output?: DropboxV1FileDownloadOutput;
};

export type DropboxV1FileMoveNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FileMoveConfig>;
	output?: DropboxV1FileMoveOutput;
};

export type DropboxV1FileUploadNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FileUploadConfig>;
	output?: DropboxV1FileUploadOutput;
};

export type DropboxV1FolderCopyNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FolderCopyConfig>;
};

export type DropboxV1FolderCreateNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FolderCreateConfig>;
	output?: DropboxV1FolderCreateOutput;
};

export type DropboxV1FolderDeleteNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FolderDeleteConfig>;
	output?: DropboxV1FolderDeleteOutput;
};

export type DropboxV1FolderListNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FolderListConfig>;
	output?: DropboxV1FolderListOutput;
};

export type DropboxV1FolderMoveNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1FolderMoveConfig>;
	output?: DropboxV1FolderMoveOutput;
};

export type DropboxV1SearchQueryNode = DropboxV1NodeBase & {
	config: NodeConfig<DropboxV1SearchQueryConfig>;
	output?: DropboxV1SearchQueryOutput;
};

export type DropboxV1Node =
	| DropboxV1FileCopyNode
	| DropboxV1FileDeleteNode
	| DropboxV1FileDownloadNode
	| DropboxV1FileMoveNode
	| DropboxV1FileUploadNode
	| DropboxV1FolderCopyNode
	| DropboxV1FolderCreateNode
	| DropboxV1FolderDeleteNode
	| DropboxV1FolderListNode
	| DropboxV1FolderMoveNode
	| DropboxV1SearchQueryNode
	;