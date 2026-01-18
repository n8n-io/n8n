/**
 * Box Node - Version 1
 * Consume Box API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type BoxV1Params =
	| BoxV1FileCopyConfig
	| BoxV1FileDeleteConfig
	| BoxV1FileDownloadConfig
	| BoxV1FileGetConfig
	| BoxV1FileSearchConfig
	| BoxV1FileShareConfig
	| BoxV1FileUploadConfig
	| BoxV1FolderCreateConfig
	| BoxV1FolderDeleteConfig
	| BoxV1FolderGetConfig
	| BoxV1FolderSearchConfig
	| BoxV1FolderShareConfig
	| BoxV1FolderUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BoxV1Credentials {
	boxOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type BoxV1Node = {
	type: 'n8n-nodes-base.box';
	version: 1;
	config: NodeConfig<BoxV1Params>;
	credentials?: BoxV1Credentials;
};