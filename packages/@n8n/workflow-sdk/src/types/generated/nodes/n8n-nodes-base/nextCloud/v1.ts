/**
 * Nextcloud Node - Version 1
 * Access data on Nextcloud
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Copy a file */
export type NextCloudV1FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
/**
 * The path of file or folder to copy. The path should start with "/".
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The destination path of file or folder. The path should start with "/".
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Delete a file */
export type NextCloudV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * The path to delete. Can be a single file or a whole folder. The path should start with "/".
 * @displayOptions.show { operation: ["delete"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
};

/** Download a file */
export type NextCloudV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
/**
 * The file path of the file to download. Has to contain the full path. The path should start with "/".
 * @displayOptions.show { operation: ["download"], resource: ["file"] }
 */
		path: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Move a file */
export type NextCloudV1FileMoveConfig = {
	resource: 'file';
	operation: 'move';
/**
 * The path of file or folder to move. The path should start with "/".
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The new path of file or folder. The path should start with "/".
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Share a file */
export type NextCloudV1FileShareConfig = {
	resource: 'file';
	operation: 'share';
/**
 * The file path of the file to share. Has to contain the full path. The path should start with "/".
 * @displayOptions.show { operation: ["share"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The share permissions to set
 * @displayOptions.show { operation: ["share"], resource: ["file", "folder"] }
 * @default 0
 */
		shareType?: 7 | 4 | 1 | 3 | 0 | Expression<number>;
/**
 * The ID of the circle to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [7] }
 */
		circleId?: string | Expression<string>;
/**
 * The Email address to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [4] }
 */
		email?: string | Expression<string>;
/**
 * The ID of the group to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [1] }
 */
		groupId?: string | Expression<string>;
/**
 * The user to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [0] }
 */
		user?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Upload a file */
export type NextCloudV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * The absolute file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		path: string | Expression<string>;
	binaryDataUpload: boolean | Expression<boolean>;
/**
 * The text content of the file to upload
 * @displayOptions.show { binaryDataUpload: [false], operation: ["upload"], resource: ["file"] }
 */
		fileContent?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Copy a file */
export type NextCloudV1FolderCopyConfig = {
	resource: 'folder';
	operation: 'copy';
/**
 * The path of file or folder to copy. The path should start with "/".
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The destination path of file or folder. The path should start with "/".
 * @displayOptions.show { operation: ["copy"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Create a folder */
export type NextCloudV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * The folder to create. The parent folder has to exist. The path should start with "/".
 * @displayOptions.show { operation: ["create"], resource: ["folder"] }
 */
		path: string | Expression<string>;
};

/** Delete a file */
export type NextCloudV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
/**
 * The path to delete. Can be a single file or a whole folder. The path should start with "/".
 * @displayOptions.show { operation: ["delete"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
};

/** Return the contents of a given folder */
export type NextCloudV1FolderListConfig = {
	resource: 'folder';
	operation: 'list';
/**
 * The path of which to list the content. The path should start with "/".
 * @displayOptions.show { operation: ["list"], resource: ["folder"] }
 */
		path?: string | Expression<string>;
};

/** Move a file */
export type NextCloudV1FolderMoveConfig = {
	resource: 'folder';
	operation: 'move';
/**
 * The path of file or folder to move. The path should start with "/".
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The new path of file or folder. The path should start with "/".
 * @displayOptions.show { operation: ["move"], resource: ["file", "folder"] }
 */
		toPath: string | Expression<string>;
};

/** Share a file */
export type NextCloudV1FolderShareConfig = {
	resource: 'folder';
	operation: 'share';
/**
 * The file path of the file to share. Has to contain the full path. The path should start with "/".
 * @displayOptions.show { operation: ["share"], resource: ["file", "folder"] }
 */
		path: string | Expression<string>;
/**
 * The share permissions to set
 * @displayOptions.show { operation: ["share"], resource: ["file", "folder"] }
 * @default 0
 */
		shareType?: 7 | 4 | 1 | 3 | 0 | Expression<number>;
/**
 * The ID of the circle to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [7] }
 */
		circleId?: string | Expression<string>;
/**
 * The Email address to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [4] }
 */
		email?: string | Expression<string>;
/**
 * The ID of the group to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [1] }
 */
		groupId?: string | Expression<string>;
/**
 * The user to share with
 * @displayOptions.show { resource: ["file", "folder"], operation: ["share"], shareType: [0] }
 */
		user?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a folder */
export type NextCloudV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * Username the user will have
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		userId: string | Expression<string>;
/**
 * The email of the user to invite
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a file */
export type NextCloudV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * Username the user will have
 * @displayOptions.show { resource: ["user"], operation: ["delete", "get", "update"] }
 */
		userId: string | Expression<string>;
};

/** Retrieve information about a single user */
export type NextCloudV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Username the user will have
 * @displayOptions.show { resource: ["user"], operation: ["delete", "get", "update"] }
 */
		userId: string | Expression<string>;
};

/** Retrieve a list of users */
export type NextCloudV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Edit attributes related to a user */
export type NextCloudV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * Username the user will have
 * @displayOptions.show { resource: ["user"], operation: ["delete", "get", "update"] }
 */
		userId: string | Expression<string>;
	updateFields?: {
		field?: {
			/** Key of the updated attribute
			 * @default email
			 */
			key?: 'address' | 'displayname' | 'email' | 'password' | 'twitter' | 'website' | Expression<string>;
			/** Value of the updated attribute
			 */
			value?: string | Expression<string>;
		};
	};
};

export type NextCloudV1Params =
	| NextCloudV1FileCopyConfig
	| NextCloudV1FileDeleteConfig
	| NextCloudV1FileDownloadConfig
	| NextCloudV1FileMoveConfig
	| NextCloudV1FileShareConfig
	| NextCloudV1FileUploadConfig
	| NextCloudV1FolderCopyConfig
	| NextCloudV1FolderCreateConfig
	| NextCloudV1FolderDeleteConfig
	| NextCloudV1FolderListConfig
	| NextCloudV1FolderMoveConfig
	| NextCloudV1FolderShareConfig
	| NextCloudV1UserCreateConfig
	| NextCloudV1UserDeleteConfig
	| NextCloudV1UserGetConfig
	| NextCloudV1UserGetAllConfig
	| NextCloudV1UserUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NextCloudV1Credentials {
	nextCloudApi: CredentialReference;
	nextCloudOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type NextCloudV1Node = {
	type: 'n8n-nodes-base.nextCloud';
	version: 1;
	config: NodeConfig<NextCloudV1Params>;
	credentials?: NextCloudV1Credentials;
};