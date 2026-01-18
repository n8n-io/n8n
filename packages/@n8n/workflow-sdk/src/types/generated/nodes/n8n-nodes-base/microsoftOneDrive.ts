/**
 * Microsoft OneDrive Node Types
 *
 * Consume Microsoft OneDrive API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftonedrive/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	fileId?: string | Expression<string>;
};

/** Rename a file */
export type MicrosoftOneDriveV11FileRenameConfig = {
	resource: 'file';
	operation: 'rename';
	/**
	 * ID of the file
	 */
	itemId?: string | Expression<string>;
	/**
	 * New name for file
	 */
	newName?: string | Expression<string>;
};

/** Search a file */
export type MicrosoftOneDriveV11FileSearchConfig = {
	resource: 'file';
	operation: 'search';
	/**
	 * The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.
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
	 */
	type?: 'view' | 'edit' | 'embed' | Expression<string>;
	/**
	 * The type of sharing link to create
	 */
	scope?: 'anonymous' | 'organization' | Expression<string>;
};

/** Upload a file up to 4MB in size */
export type MicrosoftOneDriveV11FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * The name the file should be saved as
	 */
	fileName?: string | Expression<string>;
	/**
	 * ID of the parent folder that will contain the file
	 */
	parentId: string | Expression<string>;
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData: boolean | Expression<boolean>;
	/**
	 * The text content of the file
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
	 */
	itemId?: string | Expression<string>;
	/**
	 * New name for folder
	 */
	newName?: string | Expression<string>;
};

/** Search a file */
export type MicrosoftOneDriveV11FolderSearchConfig = {
	resource: 'folder';
	operation: 'search';
	/**
	 * The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.
	 */
	query?: string | Expression<string>;
};

/** Share a file */
export type MicrosoftOneDriveV11FolderShareConfig = {
	resource: 'folder';
	operation: 'share';
	/**
	 * File ID
	 */
	folderId?: string | Expression<string>;
	/**
	 * The type of sharing link to create
	 */
	type?: 'view' | 'edit' | 'embed' | Expression<string>;
	/**
	 * The type of sharing link to create
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
	| MicrosoftOneDriveV11FolderShareConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOneDriveV11Credentials {
	microsoftOneDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftOneDriveV11Node = {
	type: 'n8n-nodes-base.microsoftOneDrive';
	version: 1 | 1.1;
	config: NodeConfig<MicrosoftOneDriveV11Params>;
	credentials?: MicrosoftOneDriveV11Credentials;
};

export type MicrosoftOneDriveNode = MicrosoftOneDriveV11Node;
