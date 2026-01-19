/**
 * Microsoft OneDrive Node - Version 1
 * Consume Microsoft OneDrive API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Copy a file */
export type MicrosoftOneDriveV1FileCopyConfig = {
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
export type MicrosoftOneDriveV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
/**
 * Field ID
 * @displayOptions.show { operation: ["delete"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** Download a file */
export type MicrosoftOneDriveV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	fileId?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get a file */
export type MicrosoftOneDriveV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * Field ID
 * @displayOptions.show { operation: ["get"], resource: ["file"] }
 */
		fileId?: string | Expression<string>;
};

/** Rename a file */
export type MicrosoftOneDriveV1FileRenameConfig = {
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
export type MicrosoftOneDriveV1FileSearchConfig = {
	resource: 'file';
	operation: 'search';
/**
 * The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.
 * @displayOptions.show { operation: ["search"], resource: ["file"] }
 */
		query?: string | Expression<string>;
};

/** Share a file */
export type MicrosoftOneDriveV1FileShareConfig = {
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
export type MicrosoftOneDriveV1FileUploadConfig = {
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
export type MicrosoftOneDriveV1FolderCreateConfig = {
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
export type MicrosoftOneDriveV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	folderId?: string | Expression<string>;
};

/** Get items inside a folder */
export type MicrosoftOneDriveV1FolderGetChildrenConfig = {
	resource: 'folder';
	operation: 'getChildren';
	folderId?: string | Expression<string>;
};

/** Rename a file */
export type MicrosoftOneDriveV1FolderRenameConfig = {
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
export type MicrosoftOneDriveV1FolderSearchConfig = {
	resource: 'folder';
	operation: 'search';
/**
 * The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.
 * @displayOptions.show { operation: ["search"], resource: ["folder"] }
 */
		query?: string | Expression<string>;
};

/** Share a file */
export type MicrosoftOneDriveV1FolderShareConfig = {
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOneDriveV1Credentials {
	microsoftOneDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftOneDriveV1NodeBase {
	type: 'n8n-nodes-base.microsoftOneDrive';
	version: 1;
	credentials?: MicrosoftOneDriveV1Credentials;
}

export type MicrosoftOneDriveV1FileCopyNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileCopyConfig>;
};

export type MicrosoftOneDriveV1FileDeleteNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileDeleteConfig>;
};

export type MicrosoftOneDriveV1FileDownloadNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileDownloadConfig>;
};

export type MicrosoftOneDriveV1FileGetNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileGetConfig>;
};

export type MicrosoftOneDriveV1FileRenameNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileRenameConfig>;
};

export type MicrosoftOneDriveV1FileSearchNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileSearchConfig>;
};

export type MicrosoftOneDriveV1FileShareNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileShareConfig>;
};

export type MicrosoftOneDriveV1FileUploadNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FileUploadConfig>;
};

export type MicrosoftOneDriveV1FolderCreateNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FolderCreateConfig>;
};

export type MicrosoftOneDriveV1FolderDeleteNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FolderDeleteConfig>;
};

export type MicrosoftOneDriveV1FolderGetChildrenNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FolderGetChildrenConfig>;
};

export type MicrosoftOneDriveV1FolderRenameNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FolderRenameConfig>;
};

export type MicrosoftOneDriveV1FolderSearchNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FolderSearchConfig>;
};

export type MicrosoftOneDriveV1FolderShareNode = MicrosoftOneDriveV1NodeBase & {
	config: NodeConfig<MicrosoftOneDriveV1FolderShareConfig>;
};

export type MicrosoftOneDriveV1Node =
	| MicrosoftOneDriveV1FileCopyNode
	| MicrosoftOneDriveV1FileDeleteNode
	| MicrosoftOneDriveV1FileDownloadNode
	| MicrosoftOneDriveV1FileGetNode
	| MicrosoftOneDriveV1FileRenameNode
	| MicrosoftOneDriveV1FileSearchNode
	| MicrosoftOneDriveV1FileShareNode
	| MicrosoftOneDriveV1FileUploadNode
	| MicrosoftOneDriveV1FolderCreateNode
	| MicrosoftOneDriveV1FolderDeleteNode
	| MicrosoftOneDriveV1FolderGetChildrenNode
	| MicrosoftOneDriveV1FolderRenameNode
	| MicrosoftOneDriveV1FolderSearchNode
	| MicrosoftOneDriveV1FolderShareNode
	;