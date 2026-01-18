/**
 * Google Drive Node Types
 *
 * Access data on Google Drive
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googledrive/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a copy of an existing file */
export type GoogleDriveV3FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
	/**
	 * The file to copy
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	/**
	 * The name of the new file. If not set, “Copy of {original file name}” will be used.
	 */
	name?: string | Expression<string>;
	/**
	 * Whether to copy the file in the same folder as the original file
	 * @default true
	 */
	sameFolder?: boolean | Expression<boolean>;
	/**
	 * The drive where to save the copied file
	 * @default {"mode":"list","value":"My Drive"}
	 */
	driveId: ResourceLocatorValue;
	/**
	 * The folder where to save the copied file
	 * @default {"mode":"list","value":"root","cachedResultName":"/ (Root folder)"}
	 */
	folderId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Create a file from a provided text */
export type GoogleDriveV3FileCreateFromTextConfig = {
	resource: 'file';
	operation: 'createFromText';
	/**
	 * The text to create the file with
	 */
	content?: string | Expression<string>;
	/**
	 * The name of the file you want to create. If not specified, 'Untitled' will be used.
	 */
	name?: string | Expression<string>;
	/**
	 * The drive where to create the new file
	 * @default {"mode":"list","value":"My Drive"}
	 */
	driveId?: ResourceLocatorValue;
	/**
	 * The folder where to create the new file
	 * @default {"mode":"list","value":"root","cachedResultName":"/ (Root folder)"}
	 */
	folderId?: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Permanently delete a file */
export type GoogleDriveV3FileDeleteFileConfig = {
	resource: 'file';
	operation: 'deleteFile';
	/**
	 * The file to delete
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Download a file */
export type GoogleDriveV3FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	/**
	 * The file to download
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Move a file to another folder */
export type GoogleDriveV3FileMoveConfig = {
	resource: 'file';
	operation: 'move';
	/**
	 * The file to move
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	/**
	 * The drive where to move the file
	 * @default {"mode":"list","value":"My Drive"}
	 */
	driveId: ResourceLocatorValue;
	/**
	 * The folder where to move the file
	 * @default {"mode":"list","value":"root","cachedResultName":"/ (Root folder)"}
	 */
	folderId: ResourceLocatorValue;
};

/** Add sharing permissions to a file */
export type GoogleDriveV3FileShareConfig = {
	resource: 'file';
	operation: 'share';
	/**
	 * The file to share
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	permissionsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Update a shared drive */
export type GoogleDriveV3FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
	/**
	 * The file to update
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	/**
	 * Whether to send a new binary data to update the file
	 * @default false
	 */
	changeFileContent?: boolean | Expression<boolean>;
	/**
	 * Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab
	 * @default data
	 */
	inputDataFieldName?: string | Expression<string>;
	/**
	 * If not specified, the file name will not be changed
	 */
	newUpdatedFileName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Upload an existing file to Google Drive */
export type GoogleDriveV3FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab
	 * @default data
	 */
	inputDataFieldName: string | Expression<string>;
	/**
	 * If not specified, the original file name will be used
	 */
	name?: string | Expression<string>;
	/**
	 * The drive where to upload the file
	 * @default {"mode":"list","value":"My Drive"}
	 */
	driveId: ResourceLocatorValue;
	/**
	 * The folder where to upload the file
	 * @default {"mode":"list","value":"root","cachedResultName":"/ (Root folder)"}
	 */
	folderId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Search or list files and folders */
export type GoogleDriveV3FileFolderSearchConfig = {
	resource: 'fileFolder';
	operation: 'search';
	/**
	 * Whether to search for the file/folder name or use a query string
	 * @default name
	 */
	searchMethod?: 'name' | 'query' | Expression<string>;
	/**
	 * The name of the file or folder to search for. Returns also files and folders whose names partially match this search term.
	 */
	queryString?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filter?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create a shared drive */
export type GoogleDriveV3FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	/**
	 * The name of the new folder. If not set, 'Untitled' will be used.
	 */
	name?: string | Expression<string>;
	/**
	 * The drive where to create the new folder
	 * @default {"mode":"list","value":"My Drive"}
	 */
	driveId: ResourceLocatorValue;
	/**
	 * The parent folder where to create the new folder
	 * @default {"mode":"list","value":"root","cachedResultName":"/ (Root folder)"}
	 */
	folderId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Permanently delete a folder */
export type GoogleDriveV3FolderDeleteFolderConfig = {
	resource: 'folder';
	operation: 'deleteFolder';
	/**
	 * The folder to delete
	 * @default {"mode":"list","value":""}
	 */
	folderNoRootId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Add sharing permissions to a file */
export type GoogleDriveV3FolderShareConfig = {
	resource: 'folder';
	operation: 'share';
	/**
	 * The folder to share
	 * @default {"mode":"list","value":""}
	 */
	folderNoRootId: ResourceLocatorValue;
	permissionsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create a shared drive */
export type GoogleDriveV3DriveCreateConfig = {
	resource: 'drive';
	operation: 'create';
	/**
	 * The name of the shared drive to create
	 */
	name?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Permanently delete a shared drive */
export type GoogleDriveV3DriveDeleteDriveConfig = {
	resource: 'drive';
	operation: 'deleteDrive';
	/**
	 * The shared drive to delete
	 * @default {"mode":"list","value":""}
	 */
	driveId: ResourceLocatorValue;
};

/** Get a shared drive */
export type GoogleDriveV3DriveGetConfig = {
	resource: 'drive';
	operation: 'get';
	/**
	 * The shared drive to get
	 * @default {"mode":"list","value":""}
	 */
	driveId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Get the list of shared drives */
export type GoogleDriveV3DriveListConfig = {
	resource: 'drive';
	operation: 'list';
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

/** Update a shared drive */
export type GoogleDriveV3DriveUpdateConfig = {
	resource: 'drive';
	operation: 'update';
	/**
	 * The shared drive to update
	 * @default {"mode":"list","value":""}
	 */
	driveId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

export type GoogleDriveV3Params =
	| GoogleDriveV3FileCopyConfig
	| GoogleDriveV3FileCreateFromTextConfig
	| GoogleDriveV3FileDeleteFileConfig
	| GoogleDriveV3FileDownloadConfig
	| GoogleDriveV3FileMoveConfig
	| GoogleDriveV3FileShareConfig
	| GoogleDriveV3FileUpdateConfig
	| GoogleDriveV3FileUploadConfig
	| GoogleDriveV3FileFolderSearchConfig
	| GoogleDriveV3FolderCreateConfig
	| GoogleDriveV3FolderDeleteFolderConfig
	| GoogleDriveV3FolderShareConfig
	| GoogleDriveV3DriveCreateConfig
	| GoogleDriveV3DriveDeleteDriveConfig
	| GoogleDriveV3DriveGetConfig
	| GoogleDriveV3DriveListConfig
	| GoogleDriveV3DriveUpdateConfig;

/** Create a folder */
export type GoogleDriveV2DriveCreateConfig = {
	resource: 'drive';
	operation: 'create';
	options?: Record<string, unknown>;
	/**
	 * The name of this shared drive
	 */
	name?: string | Expression<string>;
};

/** Delete a file */
export type GoogleDriveV2DriveDeleteConfig = {
	resource: 'drive';
	operation: 'delete';
	options?: Record<string, unknown>;
	/**
	 * The ID of the drive
	 * @default {"mode":"list","value":""}
	 */
	driveId: ResourceLocatorValue;
};

/** Get a drive */
export type GoogleDriveV2DriveGetConfig = {
	resource: 'drive';
	operation: 'get';
	options?: Record<string, unknown>;
	/**
	 * The ID of the drive
	 * @default {"mode":"list","value":""}
	 */
	driveId: ResourceLocatorValue;
};

/** List files and folders */
export type GoogleDriveV2DriveListConfig = {
	resource: 'drive';
	operation: 'list';
	options?: Record<string, unknown>;
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

/** Update a file */
export type GoogleDriveV2DriveUpdateConfig = {
	resource: 'drive';
	operation: 'update';
	options?: Record<string, unknown>;
	/**
	 * The ID of the drive
	 * @default {"mode":"list","value":""}
	 */
	driveId: ResourceLocatorValue;
};

/** Copy a file */
export type GoogleDriveV2FileCopyConfig = {
	resource: 'file';
	operation: 'copy';
	/**
	 * The ID of the file
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Delete a file */
export type GoogleDriveV2FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	/**
	 * The ID of the file
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Download a file */
export type GoogleDriveV2FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	/**
	 * The ID of the file
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	binaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** List files and folders */
export type GoogleDriveV2FileListConfig = {
	resource: 'file';
	operation: 'list';
	/**
	 * Whether a query string should be used to filter results
	 * @default false
	 */
	useQueryString?: boolean | Expression<boolean>;
	/**
	 * Query to use to return only specific files
	 */
	queryString?: string | Expression<string>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Filters to use to return only specific files
	 * @default {}
	 */
	queryFilters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Share a file */
export type GoogleDriveV2FileShareConfig = {
	resource: 'file';
	operation: 'share';
	/**
	 * The ID of the file
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	permissionsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Update a file */
export type GoogleDriveV2FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
	/**
	 * The ID of the file
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Upload a file */
export type GoogleDriveV2FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
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
	/**
	 * The name the file should be saved as
	 */
	name: string | Expression<string>;
	/**
	 * By default the response only contain the ID of the file. If this option gets activated, it will resolve the data automatically.
	 * @default false
	 */
	resolveData?: boolean | Expression<boolean>;
	/**
	 * The IDs of the parent folders which contain the file
	 * @default []
	 */
	parents?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a folder */
export type GoogleDriveV2FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	/**
	 * The name of folder to create
	 */
	name: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a file */
export type GoogleDriveV2FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	/**
	 * The ID of the folder
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Share a file */
export type GoogleDriveV2FolderShareConfig = {
	resource: 'folder';
	operation: 'share';
	/**
	 * The ID of the folder
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	permissionsUi?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type GoogleDriveV2Params =
	| GoogleDriveV2DriveCreateConfig
	| GoogleDriveV2DriveDeleteConfig
	| GoogleDriveV2DriveGetConfig
	| GoogleDriveV2DriveListConfig
	| GoogleDriveV2DriveUpdateConfig
	| GoogleDriveV2FileCopyConfig
	| GoogleDriveV2FileDeleteConfig
	| GoogleDriveV2FileDownloadConfig
	| GoogleDriveV2FileListConfig
	| GoogleDriveV2FileShareConfig
	| GoogleDriveV2FileUpdateConfig
	| GoogleDriveV2FileUploadConfig
	| GoogleDriveV2FolderCreateConfig
	| GoogleDriveV2FolderDeleteConfig
	| GoogleDriveV2FolderShareConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleDriveV3Credentials {
	googleApi: CredentialReference;
	googleDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleDriveNode = {
	type: 'n8n-nodes-base.googleDrive';
	version: 1 | 2 | 3;
	config: NodeConfig<GoogleDriveV3Params>;
	credentials?: GoogleDriveV3Credentials;
};
