/**
 * Box Node - Version 1
 * Consume Box API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Copy a file */
export type BoxV1FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
	fileId: string | Expression<string>;
/**
 * The ID of folder to copy the file to. If not defined will be copied to the root folder.
 * @displayOptions.show { operation: ["copy"], resource: ["file"] }
 */
		parentId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a file */
export type BoxV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * Field ID
 * @displayOptions.show { operation: ["delete"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** Download a file */
export type BoxV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	fileId?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get a file */
export type BoxV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * Field ID
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Search files */
export type BoxV1FileSearchConfig = {
	resource: 'file';
	operation: 'search';
/**
 * The string to search for. This query is matched against item names, descriptions, text content of files, and various other fields of the different item types.
 * @displayOptions.show { operation: ["search"], resource: ["file"] }
 */
		query?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["search"], resource: ["file"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["search"], resource: ["file"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Share a file */
export type BoxV1FileShareConfig = {
	resource: 'file';
	operation: 'share';
/**
 * The ID of the file to share
 * @displayOptions.show { operation: ["share"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
/**
 * The type of object the file will be shared with
 * @displayOptions.show { operation: ["share"], resource: ["file"] }
 */
		accessibleBy?: 'group' | 'user' | Expression<string>;
/**
 * Whether identify the user by email or ID
 * @displayOptions.show { operation: ["share"], resource: ["file"], accessibleBy: ["user"] }
 * @default true
 */
		useEmail?: boolean | Expression<boolean>;
/**
 * The user's email address to share the file with
 * @displayOptions.show { operation: ["share"], resource: ["file"], useEmail: [true], accessibleBy: ["user"] }
 */
		email?: string | Expression<string>;
/**
 * The user's ID to share the file with
 * @displayOptions.show { operation: ["share"], resource: ["file"], useEmail: [false], accessibleBy: ["user"] }
 */
		userId?: string | Expression<string>;
/**
 * The group's ID to share the file with
 * @displayOptions.show { operation: ["share"], resource: ["file"], accessibleBy: ["group"] }
 */
		groupId?: string | Expression<string>;
/**
 * The level of access granted
 * @displayOptions.show { operation: ["share"], resource: ["file"] }
 * @default editor
 */
		role?: 'coOwner' | 'editor' | 'previewer' | 'previewerUploader' | 'uploader' | 'viewer' | 'viewerUploader' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Upload a file */
export type BoxV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * The name the file should be saved as
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		fileName?: string | Expression<string>;
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default false
 */
		binaryData: boolean | Expression<boolean>;
/**
 * The text content of the file
 * @displayOptions.show { binaryData: [false], operation: ["upload"], resource: ["file"] }
 */
		fileContent: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
/**
 * ID of the parent folder that will contain the file. If not it will be uploaded to the root folder.
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		parentId?: string | Expression<string>;
};

/** Create a folder */
export type BoxV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * Folder's name
 * @displayOptions.show { operation: ["create"], resource: ["folder"] }
 */
		name: string | Expression<string>;
/**
 * ID of the folder you want to create the new folder in. if not defined it will be created on the root folder.
 * @displayOptions.show { operation: ["create"], resource: ["folder"] }
 */
		parentId?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a file */
export type BoxV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	folderId?: string | Expression<string>;
/**
 * Whether to delete a folder that is not empty by recursively deleting the folder and all of its content
 * @displayOptions.show { operation: ["delete"], resource: ["folder"] }
 * @default false
 */
		recursive?: boolean | Expression<boolean>;
};

/** Get a file */
export type BoxV1FolderGetConfig = {
	resource: 'folder';
	operation: 'get';
	folderId?: string | Expression<string>;
};

/** Search files */
export type BoxV1FolderSearchConfig = {
	resource: 'folder';
	operation: 'search';
/**
 * The string to search for. This query is matched against item names, descriptions, text content of files, and various other fields of the different item types.
 * @displayOptions.show { operation: ["search"], resource: ["folder"] }
 */
		query?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["search"], resource: ["folder"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["search"], resource: ["folder"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Share a file */
export type BoxV1FolderShareConfig = {
	resource: 'folder';
	operation: 'share';
/**
 * The ID of the folder to share
 * @displayOptions.show { operation: ["share"], resource: ["folder"] }
 */
		folderId?: string | Expression<string>;
/**
 * The type of object the file will be shared with
 * @displayOptions.show { operation: ["share"], resource: ["folder"] }
 * @default user
 */
		accessibleBy?: 'user' | 'group' | Expression<string>;
/**
 * Whether identify the user by email or ID
 * @displayOptions.show { operation: ["share"], resource: ["folder"], accessibleBy: ["user"] }
 * @default true
 */
		useEmail?: boolean | Expression<boolean>;
/**
 * The user's email address to share the folder with
 * @displayOptions.show { operation: ["share"], resource: ["folder"], accessibleBy: ["user"], useEmail: [true] }
 */
		email?: string | Expression<string>;
/**
 * The user's ID to share the folder with
 * @displayOptions.show { operation: ["share"], resource: ["folder"], accessibleBy: ["user"], useEmail: [false] }
 */
		userId?: string | Expression<string>;
/**
 * The group's ID to share the folder with
 * @displayOptions.show { operation: ["share"], resource: ["folder"], accessibleBy: ["group"] }
 */
		groupId?: string | Expression<string>;
/**
 * The level of access granted
 * @displayOptions.show { operation: ["share"], resource: ["folder"] }
 * @default editor
 */
		role?: 'coOwner' | 'editor' | 'previewer' | 'previewerUploader' | 'uploader' | 'viewer' | 'viewerUploader' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update folder */
export type BoxV1FolderUpdateConfig = {
	resource: 'folder';
	operation: 'update';
	folderId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type BoxV1FileCopyOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	file_version?: {
		id?: string;
		sha1?: string;
		type?: string;
	};
	id?: string;
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	sha1?: string;
	shared_link?: null;
	size?: number;
	trashed_at?: null;
	type?: string;
};

export type BoxV1FileDeleteOutput = {
	success?: boolean;
};

export type BoxV1FileDownloadOutput = {
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	etag?: string;
	id?: string;
	name?: string;
	sequence_id?: string;
	type?: string;
};

export type BoxV1FileGetOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	file_version?: {
		id?: string;
		sha1?: string;
		type?: string;
	};
	id?: string;
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	sha1?: string;
	size?: number;
	trashed_at?: null;
	type?: string;
};

export type BoxV1FileSearchOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	file_version?: {
		id?: string;
		sha1?: string;
		type?: string;
	};
	id?: string;
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	sha1?: string;
	size?: number;
	trashed_at?: null;
	type?: string;
};

export type BoxV1FileUploadOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	file_version?: {
		id?: string;
		sha1?: string;
		type?: string;
	};
	id?: string;
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	sha1?: string;
	shared_link?: null;
	size?: number;
	trashed_at?: null;
	type?: string;
};

export type BoxV1FolderCreateOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	folder_upload_email?: null;
	id?: string;
	item_collection?: {
		limit?: number;
		offset?: number;
		order?: Array<{
			by?: string;
			direction?: string;
		}>;
		total_count?: number;
	};
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	shared_link?: null;
	size?: number;
	trashed_at?: null;
	type?: string;
};

export type BoxV1FolderGetOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	id?: string;
	item_collection?: {
		entries?: Array<{
			etag?: string;
			file_version?: {
				id?: string;
				sha1?: string;
				type?: string;
			};
			id?: string;
			name?: string;
			sequence_id?: string;
			sha1?: string;
			type?: string;
		}>;
		limit?: number;
		offset?: number;
		order?: Array<{
			by?: string;
			direction?: string;
		}>;
		total_count?: number;
	};
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	size?: number;
	trashed_at?: null;
	type?: string;
};

export type BoxV1FolderSearchOutput = {
	content_created_at?: string;
	content_modified_at?: string;
	created_at?: string;
	created_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	description?: string;
	etag?: string;
	folder_upload_email?: null;
	id?: string;
	item_status?: string;
	modified_at?: string;
	modified_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	name?: string;
	owned_by?: {
		id?: string;
		login?: string;
		name?: string;
		type?: string;
	};
	parent?: {
		id?: string;
		name?: string;
		type?: string;
	};
	path_collection?: {
		entries?: Array<{
			id?: string;
			name?: string;
			type?: string;
		}>;
		total_count?: number;
	};
	purged_at?: null;
	sequence_id?: string;
	size?: number;
	trashed_at?: null;
	type?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface BoxV1Credentials {
	boxOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface BoxV1NodeBase {
	type: 'n8n-nodes-base.box';
	version: 1;
	credentials?: BoxV1Credentials;
}

export type BoxV1FileCopyNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileCopyConfig>;
	output?: BoxV1FileCopyOutput;
};

export type BoxV1FileDeleteNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileDeleteConfig>;
	output?: BoxV1FileDeleteOutput;
};

export type BoxV1FileDownloadNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileDownloadConfig>;
	output?: BoxV1FileDownloadOutput;
};

export type BoxV1FileGetNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileGetConfig>;
	output?: BoxV1FileGetOutput;
};

export type BoxV1FileSearchNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileSearchConfig>;
	output?: BoxV1FileSearchOutput;
};

export type BoxV1FileShareNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileShareConfig>;
};

export type BoxV1FileUploadNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FileUploadConfig>;
	output?: BoxV1FileUploadOutput;
};

export type BoxV1FolderCreateNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FolderCreateConfig>;
	output?: BoxV1FolderCreateOutput;
};

export type BoxV1FolderDeleteNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FolderDeleteConfig>;
};

export type BoxV1FolderGetNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FolderGetConfig>;
	output?: BoxV1FolderGetOutput;
};

export type BoxV1FolderSearchNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FolderSearchConfig>;
	output?: BoxV1FolderSearchOutput;
};

export type BoxV1FolderShareNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FolderShareConfig>;
};

export type BoxV1FolderUpdateNode = BoxV1NodeBase & {
	config: NodeConfig<BoxV1FolderUpdateConfig>;
};

export type BoxV1Node =
	| BoxV1FileCopyNode
	| BoxV1FileDeleteNode
	| BoxV1FileDownloadNode
	| BoxV1FileGetNode
	| BoxV1FileSearchNode
	| BoxV1FileShareNode
	| BoxV1FileUploadNode
	| BoxV1FolderCreateNode
	| BoxV1FolderDeleteNode
	| BoxV1FolderGetNode
	| BoxV1FolderSearchNode
	| BoxV1FolderShareNode
	| BoxV1FolderUpdateNode
	;