/**
 * Google Drive Node - Version 3
 * Access data on Google Drive
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["file"], operation: ["copy"] }
 * @default {"mode":"list","value":""}
 */
		fileId: ResourceLocatorValue;
/**
 * The name of the new file. If not set, “Copy of {original file name}” will be used.
 * @displayOptions.show { resource: ["file"], operation: ["copy"] }
 */
		name?: string | Expression<string>;
/**
 * Whether to copy the file in the same folder as the original file
 * @displayOptions.show { resource: ["file"], operation: ["copy"] }
 * @default true
 */
		sameFolder?: boolean | Expression<boolean>;
/**
 * The drive where to save the copied file
 * @displayOptions.show { sameFolder: [false], resource: ["file"], operation: ["copy"] }
 * @default {"mode":"list","value":"My Drive"}
 */
		driveId: ResourceLocatorValue;
/**
 * The folder where to save the copied file
 * @displayOptions.show { sameFolder: [false], resource: ["file"], operation: ["copy"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["createFromText"] }
 */
		content?: string | Expression<string>;
/**
 * The name of the file you want to create. If not specified, 'Untitled' will be used.
 * @displayOptions.show { resource: ["file"], operation: ["createFromText"] }
 */
		name?: string | Expression<string>;
/**
 * The drive where to create the new file
 * @displayOptions.show { resource: ["file"], operation: ["createFromText"] }
 * @default {"mode":"list","value":"My Drive"}
 */
		driveId?: ResourceLocatorValue;
/**
 * The folder where to create the new file
 * @displayOptions.show { resource: ["file"], operation: ["createFromText"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["deleteFile"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["download"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["move"] }
 * @default {"mode":"list","value":""}
 */
		fileId: ResourceLocatorValue;
/**
 * The drive where to move the file
 * @displayOptions.show { resource: ["file"], operation: ["move"] }
 * @default {"mode":"list","value":"My Drive"}
 */
		driveId: ResourceLocatorValue;
/**
 * The folder where to move the file
 * @displayOptions.show { resource: ["file"], operation: ["move"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["share"] }
 * @default {"mode":"list","value":""}
 */
		fileId: ResourceLocatorValue;
	permissionsUi?: {
		permissionsValues?: {
			/** Defines what users can do with the file or folder
			 */
			role?: 'commenter' | 'fileOrganizer' | 'organizer' | 'owner' | 'reader' | 'writer' | Expression<string>;
			/** The scope of the permission. A permission with type=user applies to a specific user whereas a permission with type=domain applies to everyone in a specific domain.
			 */
			type?: 'user' | 'group' | 'domain' | 'anyone' | Expression<string>;
			/** The email address of the user or group to which this permission refers
			 * @displayOptions.show { type: ["user", "group"] }
			 */
			emailAddress?: string | Expression<string>;
			/** The domain to which this permission refers
			 * @displayOptions.show { type: ["domain"] }
			 */
			domain?: string | Expression<string>;
			/** Whether to allow the file to be discovered through search
			 * @displayOptions.show { type: ["domain", "anyone"] }
			 * @default false
			 */
			allowFileDiscovery?: boolean | Expression<boolean>;
		};
	};
	options?: Record<string, unknown>;
};

/** Update a shared drive */
export type GoogleDriveV3FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
/**
 * The file to update
 * @displayOptions.show { resource: ["file"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		fileId: ResourceLocatorValue;
/**
 * Whether to send a new binary data to update the file
 * @displayOptions.show { resource: ["file"], operation: ["update"] }
 * @default false
 */
		changeFileContent?: boolean | Expression<boolean>;
/**
 * Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab
 * @hint The name of the input field containing the binary file data to update the file
 * @displayOptions.show { changeFileContent: [true], resource: ["file"], operation: ["update"] }
 * @default data
 */
		inputDataFieldName?: string | Expression<string>;
/**
 * If not specified, the file name will not be changed
 * @displayOptions.show { resource: ["file"], operation: ["update"] }
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
 * @hint The name of the input field containing the binary file data to update the file
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default data
 */
		inputDataFieldName: string | Expression<string>;
/**
 * If not specified, the original file name will be used
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 */
		name?: string | Expression<string>;
/**
 * The drive where to upload the file
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default {"mode":"list","value":"My Drive"}
 */
		driveId: ResourceLocatorValue;
/**
 * The folder where to upload the file
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
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
 * @displayOptions.show { resource: ["fileFolder"], operation: ["search"] }
 * @default name
 */
		searchMethod?: 'name' | 'query' | Expression<string>;
/**
 * The name of the file or folder to search for. Returns also files and folders whose names partially match this search term.
 * @displayOptions.show { searchMethod: ["name"], resource: ["fileFolder"], operation: ["search"] }
 */
		queryString?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["fileFolder"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["fileFolder"], operation: ["search"] }
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
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 */
		name?: string | Expression<string>;
/**
 * The drive where to create the new folder
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 * @default {"mode":"list","value":"My Drive"}
 */
		driveId: ResourceLocatorValue;
/**
 * The parent folder where to create the new folder
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["folder"], operation: ["deleteFolder"] }
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
 * @displayOptions.show { resource: ["folder"], operation: ["share"] }
 * @default {"mode":"list","value":""}
 */
		folderNoRootId: ResourceLocatorValue;
	permissionsUi?: {
		permissionsValues?: {
			/** Defines what users can do with the file or folder
			 */
			role?: 'commenter' | 'fileOrganizer' | 'organizer' | 'owner' | 'reader' | 'writer' | Expression<string>;
			/** The scope of the permission. A permission with type=user applies to a specific user whereas a permission with type=domain applies to everyone in a specific domain.
			 */
			type?: 'user' | 'group' | 'domain' | 'anyone' | Expression<string>;
			/** The email address of the user or group to which this permission refers
			 * @displayOptions.show { type: ["user", "group"] }
			 */
			emailAddress?: string | Expression<string>;
			/** The domain to which this permission refers
			 * @displayOptions.show { type: ["domain"] }
			 */
			domain?: string | Expression<string>;
			/** Whether to allow the file to be discovered through search
			 * @displayOptions.show { type: ["domain", "anyone"] }
			 * @default false
			 */
			allowFileDiscovery?: boolean | Expression<boolean>;
		};
	};
	options?: Record<string, unknown>;
};

/** Create a shared drive */
export type GoogleDriveV3DriveCreateConfig = {
	resource: 'drive';
	operation: 'create';
/**
 * The name of the shared drive to create
 * @displayOptions.show { resource: ["drive"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["drive"], operation: ["deleteDrive"] }
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
 * @displayOptions.show { resource: ["drive"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["drive"], operation: ["list"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["drive"], operation: ["list"] }
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
 * @displayOptions.show { resource: ["drive"], operation: ["update"] }
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
	| GoogleDriveV3DriveUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleDriveV3Credentials {
	googleApi: CredentialReference;
	googleDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleDriveV3NodeBase {
	type: 'n8n-nodes-base.googleDrive';
	version: 3;
	credentials?: GoogleDriveV3Credentials;
}

export type GoogleDriveV3FileCopyNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileCopyConfig>;
};

export type GoogleDriveV3FileCreateFromTextNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileCreateFromTextConfig>;
};

export type GoogleDriveV3FileDeleteFileNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileDeleteFileConfig>;
};

export type GoogleDriveV3FileDownloadNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileDownloadConfig>;
};

export type GoogleDriveV3FileMoveNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileMoveConfig>;
};

export type GoogleDriveV3FileShareNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileShareConfig>;
};

export type GoogleDriveV3FileUpdateNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileUpdateConfig>;
};

export type GoogleDriveV3FileUploadNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileUploadConfig>;
};

export type GoogleDriveV3FileFolderSearchNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FileFolderSearchConfig>;
};

export type GoogleDriveV3FolderCreateNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FolderCreateConfig>;
};

export type GoogleDriveV3FolderDeleteFolderNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FolderDeleteFolderConfig>;
};

export type GoogleDriveV3FolderShareNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3FolderShareConfig>;
};

export type GoogleDriveV3DriveCreateNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3DriveCreateConfig>;
};

export type GoogleDriveV3DriveDeleteDriveNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3DriveDeleteDriveConfig>;
};

export type GoogleDriveV3DriveGetNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3DriveGetConfig>;
};

export type GoogleDriveV3DriveListNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3DriveListConfig>;
};

export type GoogleDriveV3DriveUpdateNode = GoogleDriveV3NodeBase & {
	config: NodeConfig<GoogleDriveV3DriveUpdateConfig>;
};

export type GoogleDriveV3Node =
	| GoogleDriveV3FileCopyNode
	| GoogleDriveV3FileCreateFromTextNode
	| GoogleDriveV3FileDeleteFileNode
	| GoogleDriveV3FileDownloadNode
	| GoogleDriveV3FileMoveNode
	| GoogleDriveV3FileShareNode
	| GoogleDriveV3FileUpdateNode
	| GoogleDriveV3FileUploadNode
	| GoogleDriveV3FileFolderSearchNode
	| GoogleDriveV3FolderCreateNode
	| GoogleDriveV3FolderDeleteFolderNode
	| GoogleDriveV3FolderShareNode
	| GoogleDriveV3DriveCreateNode
	| GoogleDriveV3DriveDeleteDriveNode
	| GoogleDriveV3DriveGetNode
	| GoogleDriveV3DriveListNode
	| GoogleDriveV3DriveUpdateNode
	;