/**
 * Microsoft OneDrive Node - Version 1.1
 * Consume Microsoft OneDrive API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Copy a file */
export type MicrosoftOneDriveV11FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
	fileId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * Reference to the parent item the copy will be created in &lt;a href="https://docs.microsoft.com/en-us/onedrive/developer/rest-api/resources/itemreference?view=odsp-graph-online"&gt; Details &lt;/a&gt;
 * @displayOptions.show { operation: ["copy"], resource: ["file"] }
 * @default {}
 */
		parentReference?: Record<string, unknown>;
};

/** Delete a file */
export type MicrosoftOneDriveV11FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * Field ID
 * @displayOptions.show { operation: ["delete"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** Download a file */
export type MicrosoftOneDriveV11FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	fileId?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get a file */
export type MicrosoftOneDriveV11FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * Field ID
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** Rename a file */
export type MicrosoftOneDriveV11FileRenameConfig = {
	resource: 'file';
	operation: 'rename';
/**
 * ID of the file
 * @displayOptions.show { operation: ["rename"], resource: ["file"] }
 */
		itemId?: string | Expression<string>;
/**
 * New name for file
 * @displayOptions.show { operation: ["rename"], resource: ["file"] }
 */
		newName?: string | Expression<string>;
};

/** Search a file */
export type MicrosoftOneDriveV11FileSearchConfig = {
	resource: 'file';
	operation: 'search';
/**
 * The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.
 * @displayOptions.show { operation: ["search"], resource: ["file"] }
 */
		query?: string | Expression<string>;
};

/** Share a file */
export type MicrosoftOneDriveV11FileShareConfig = {
	resource: 'file';
	operation: 'share';
	fileId?: string | Expression<string>;
/**
 * The type of sharing link to create
 * @displayOptions.show { operation: ["share"], resource: ["file"] }
 */
		type?: 'view' | 'edit' | 'embed' | Expression<string>;
/**
 * The type of sharing link to create
 * @displayOptions.show { operation: ["share"], resource: ["file"] }
 */
		scope?: 'anonymous' | 'organization' | Expression<string>;
};

/** Upload a file up to 4MB in size */
export type MicrosoftOneDriveV11FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * The name the file should be saved as
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		fileName?: string | Expression<string>;
/**
 * ID of the parent folder that will contain the file
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 */
		parentId: string | Expression<string>;
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
};

/** Create a folder */
export type MicrosoftOneDriveV11FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * The name or path of the folder
 * @displayOptions.show { operation: ["create"], resource: ["folder"] }
 */
		name: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a file */
export type MicrosoftOneDriveV11FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	folderId?: string | Expression<string>;
};

/** Get items inside a folder */
export type MicrosoftOneDriveV11FolderGetChildrenConfig = {
	resource: 'folder';
	operation: 'getChildren';
	folderId?: string | Expression<string>;
};

/** Rename a file */
export type MicrosoftOneDriveV11FolderRenameConfig = {
	resource: 'folder';
	operation: 'rename';
/**
 * ID of the folder
 * @displayOptions.show { operation: ["rename"], resource: ["folder"] }
 */
		itemId?: string | Expression<string>;
/**
 * New name for folder
 * @displayOptions.show { operation: ["rename"], resource: ["folder"] }
 */
		newName?: string | Expression<string>;
};

/** Search a file */
export type MicrosoftOneDriveV11FolderSearchConfig = {
	resource: 'folder';
	operation: 'search';
/**
 * The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.
 * @displayOptions.show { operation: ["search"], resource: ["folder"] }
 */
		query?: string | Expression<string>;
};

/** Share a file */
export type MicrosoftOneDriveV11FolderShareConfig = {
	resource: 'folder';
	operation: 'share';
/**
 * File ID
 * @displayOptions.show { operation: ["share"], resource: ["folder"] }
 */
		folderId?: string | Expression<string>;
/**
 * The type of sharing link to create
 * @displayOptions.show { operation: ["share"], resource: ["folder"] }
 */
		type?: 'view' | 'edit' | 'embed' | Expression<string>;
/**
 * The type of sharing link to create
 * @displayOptions.show { operation: ["share"], resource: ["folder"] }
 */
		scope?: 'anonymous' | 'organization' | Expression<string>;
};

export type MicrosoftOneDriveV11Params =
	| MicrosoftOneDriveV11FileCopyConfig
	| MicrosoftOneDriveV11FileDeleteConfig
	| MicrosoftOneDriveV11FileDownloadConfig
	| MicrosoftOneDriveV11FileGetConfig
	| MicrosoftOneDriveV11FileRenameConfig
	| MicrosoftOneDriveV11FileSearchConfig
	| MicrosoftOneDriveV11FileShareConfig
	| MicrosoftOneDriveV11FileUploadConfig
	| MicrosoftOneDriveV11FolderCreateConfig
	| MicrosoftOneDriveV11FolderDeleteConfig
	| MicrosoftOneDriveV11FolderGetChildrenConfig
	| MicrosoftOneDriveV11FolderRenameConfig
	| MicrosoftOneDriveV11FolderSearchConfig
	| MicrosoftOneDriveV11FolderShareConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOneDriveV11Credentials {
	microsoftOneDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftOneDriveV11NodeBase {
	type: 'n8n-nodes-base.microsoftOneDrive';
	version: 1.1;
	credentials?: MicrosoftOneDriveV11Credentials;
}

export type MicrosoftOneDriveV11FileCopyNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileCopyConfig>;
};

export type MicrosoftOneDriveV11FileDeleteNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileDeleteConfig>;
};

export type MicrosoftOneDriveV11FileDownloadNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileDownloadConfig>;
};

export type MicrosoftOneDriveV11FileGetNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileGetConfig>;
};

export type MicrosoftOneDriveV11FileRenameNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileRenameConfig>;
};

export type MicrosoftOneDriveV11FileSearchNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileSearchConfig>;
};

export type MicrosoftOneDriveV11FileShareNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileShareConfig>;
};

export type MicrosoftOneDriveV11FileUploadNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FileUploadConfig>;
};

export type MicrosoftOneDriveV11FolderCreateNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FolderCreateConfig>;
};

export type MicrosoftOneDriveV11FolderDeleteNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FolderDeleteConfig>;
};

export type MicrosoftOneDriveV11FolderGetChildrenNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FolderGetChildrenConfig>;
};

export type MicrosoftOneDriveV11FolderRenameNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FolderRenameConfig>;
};

export type MicrosoftOneDriveV11FolderSearchNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FolderSearchConfig>;
};

export type MicrosoftOneDriveV11FolderShareNode = MicrosoftOneDriveV11NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV11FolderShareConfig>;
};

export type MicrosoftOneDriveV11Node =
	| MicrosoftOneDriveV11FileCopyNode
	| MicrosoftOneDriveV11FileDeleteNode
	| MicrosoftOneDriveV11FileDownloadNode
	| MicrosoftOneDriveV11FileGetNode
	| MicrosoftOneDriveV11FileRenameNode
	| MicrosoftOneDriveV11FileSearchNode
	| MicrosoftOneDriveV11FileShareNode
	| MicrosoftOneDriveV11FileUploadNode
	| MicrosoftOneDriveV11FolderCreateNode
	| MicrosoftOneDriveV11FolderDeleteNode
	| MicrosoftOneDriveV11FolderGetChildrenNode
	| MicrosoftOneDriveV11FolderRenameNode
	| MicrosoftOneDriveV11FolderSearchNode
	| MicrosoftOneDriveV11FolderShareNode
	;