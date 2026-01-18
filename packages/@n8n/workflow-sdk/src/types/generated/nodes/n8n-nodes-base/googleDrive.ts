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
			role?:
				| 'commenter'
				| 'fileOrganizer'
				| 'organizer'
				| 'owner'
				| 'reader'
				| 'writer'
				| Expression<string>;
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
			role?:
				| 'commenter'
				| 'fileOrganizer'
				| 'organizer'
				| 'owner'
				| 'reader'
				| 'writer'
				| Expression<string>;
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
	| GoogleDriveV3DriveUpdateConfig;

/** Create a folder */
export type GoogleDriveV2DriveCreateConfig = {
	resource: 'drive';
	operation: 'create';
	options?: Record<string, unknown>;
	/**
	 * The name of this shared drive
	 * @displayOptions.show { operation: ["create"], resource: ["drive"] }
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
	 * @hint The Google Drive drive to operate on
	 * @displayOptions.show { operation: ["delete", "get", "update"], resource: ["drive"] }
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
	 * @hint The Google Drive drive to operate on
	 * @displayOptions.show { operation: ["delete", "get", "update"], resource: ["drive"] }
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
	 * @displayOptions.show { operation: ["list"], resource: ["drive"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["list"], resource: ["drive"], returnAll: [false] }
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
	 * @hint The Google Drive drive to operate on
	 * @displayOptions.show { operation: ["delete", "get", "update"], resource: ["drive"] }
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
	 * @displayOptions.show { operation: ["download", "copy", "update", "delete", "share"], resource: ["file"] }
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
	 * @displayOptions.show { operation: ["download", "copy", "update", "delete", "share"], resource: ["file"] }
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
	 * @displayOptions.show { operation: ["download", "copy", "update", "delete", "share"], resource: ["file"] }
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
	 * @displayOptions.show { operation: ["list"], resource: ["file"] }
	 * @default false
	 */
	useQueryString?: boolean | Expression<boolean>;
	/**
	 * Query to use to return only specific files
	 * @displayOptions.show { operation: ["list"], useQueryString: [true], resource: ["file"] }
	 */
	queryString?: string | Expression<string>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["list"], resource: ["file"] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Filters to use to return only specific files
	 * @displayOptions.show { operation: ["list"], useQueryString: [false], resource: ["file"] }
	 * @default {}
	 */
	queryFilters?: {
		name?: Array<{
			/** Operation
			 * @default contains
			 */
			operation?: 'contains' | 'is' | 'isNot' | Expression<string>;
			/** The value for operation
			 */
			value?: string | Expression<string>;
		}>;
		mimeType?: Array<{
			/** The Mime-Type of the files to return
			 * @default application/vnd.google-apps.file
			 */
			mimeType?:
				| 'application/vnd.google-apps.drive-sdk'
				| 'application/vnd.google-apps.audio'
				| 'custom'
				| 'application/vnd.google-apps.script'
				| 'application/vnd.google-apps.document'
				| 'application/vnd.google-apps.drawing'
				| 'application/vnd.google-apps.file'
				| 'application/vnd.google-apps.folder'
				| 'application/vnd.google-apps.form'
				| 'application/vnd.google-apps.fusiontable'
				| 'application/vnd.google-apps.map'
				| 'application/vnd.google-apps.spreadsheet'
				| 'application/vnd.google-apps.site'
				| 'application/vnd.google-apps.presentation'
				| 'application/vnd.google-apps.photo'
				| 'application/vnd.google-apps.unknown'
				| 'application/vnd.google-apps.video'
				| Expression<string>;
			/** Custom Mime Type
			 * @displayOptions.show { mimeType: ["custom"] }
			 */
			customMimeType?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Share a file */
export type GoogleDriveV2FileShareConfig = {
	resource: 'file';
	operation: 'share';
	/**
	 * The ID of the file
	 * @displayOptions.show { operation: ["download", "copy", "update", "delete", "share"], resource: ["file"] }
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	permissionsUi?: {
		permissionsValues?: {
			/** Role
			 */
			role?:
				| 'commenter'
				| 'fileOrganizer'
				| 'organizer'
				| 'owner'
				| 'reader'
				| 'writer'
				| Expression<string>;
			/** Information about the different types can be found &lt;a href="https://developers.google.com/drive/api/v3/ref-roles"&gt;here&lt;/a&gt;
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
			/** Whether the permission allows the file to be discovered through search
			 * @displayOptions.show { type: ["domain", "anyone"] }
			 * @default false
			 */
			allowFileDiscovery?: boolean | Expression<boolean>;
		};
	};
	options?: Record<string, unknown>;
};

/** Update a file */
export type GoogleDriveV2FileUpdateConfig = {
	resource: 'file';
	operation: 'update';
	/**
	 * The ID of the file
	 * @displayOptions.show { operation: ["download", "copy", "update", "delete", "share"], resource: ["file"] }
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
	/**
	 * The name the file should be saved as
	 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
	 */
	name: string | Expression<string>;
	/**
	 * By default the response only contain the ID of the file. If this option gets activated, it will resolve the data automatically.
	 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
	 * @default false
	 */
	resolveData?: boolean | Expression<boolean>;
	/**
	 * The IDs of the parent folders which contain the file
	 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
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
	 * @displayOptions.show { operation: ["create"], resource: ["folder"] }
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
	 * @displayOptions.show { operation: ["delete", "share"], resource: ["folder"] }
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
	 * @displayOptions.show { operation: ["delete", "share"], resource: ["folder"] }
	 * @default {"mode":"list","value":""}
	 */
	fileId: ResourceLocatorValue;
	permissionsUi?: {
		permissionsValues?: {
			/** Role
			 */
			role?:
				| 'commenter'
				| 'fileOrganizer'
				| 'organizer'
				| 'owner'
				| 'reader'
				| 'writer'
				| Expression<string>;
			/** Information about the different types can be found &lt;a href="https://developers.google.com/drive/api/v3/ref-roles"&gt;here&lt;/a&gt;
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
			/** Whether the permission allows the file to be discovered through search
			 * @displayOptions.show { type: ["domain", "anyone"] }
			 * @default false
			 */
			allowFileDiscovery?: boolean | Expression<boolean>;
		};
	};
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

export interface GoogleDriveV2Credentials {
	googleApi: CredentialReference;
	googleDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleDriveV3Node = {
	type: 'n8n-nodes-base.googleDrive';
	version: 3;
	config: NodeConfig<GoogleDriveV3Params>;
	credentials?: GoogleDriveV3Credentials;
};

export type GoogleDriveV2Node = {
	type: 'n8n-nodes-base.googleDrive';
	version: 1 | 2;
	config: NodeConfig<GoogleDriveV2Params>;
	credentials?: GoogleDriveV2Credentials;
};

export type GoogleDriveNode = GoogleDriveV3Node | GoogleDriveV2Node;
