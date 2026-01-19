/**
 * Google Drive Node - Version 1
 * Access data on Google Drive
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a folder */
export type GoogleDriveV1DriveCreateConfig = {
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
export type GoogleDriveV1DriveDeleteConfig = {
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
export type GoogleDriveV1DriveGetConfig = {
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
export type GoogleDriveV1DriveListConfig = {
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
export type GoogleDriveV1DriveUpdateConfig = {
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
export type GoogleDriveV1FileCopyConfig = {
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
export type GoogleDriveV1FileDeleteConfig = {
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
export type GoogleDriveV1FileDownloadConfig = {
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
export type GoogleDriveV1FileListConfig = {
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
			mimeType?: 'application/vnd.google-apps.drive-sdk' | 'application/vnd.google-apps.audio' | 'custom' | 'application/vnd.google-apps.script' | 'application/vnd.google-apps.document' | 'application/vnd.google-apps.drawing' | 'application/vnd.google-apps.file' | 'application/vnd.google-apps.folder' | 'application/vnd.google-apps.form' | 'application/vnd.google-apps.fusiontable' | 'application/vnd.google-apps.map' | 'application/vnd.google-apps.spreadsheet' | 'application/vnd.google-apps.site' | 'application/vnd.google-apps.presentation' | 'application/vnd.google-apps.photo' | 'application/vnd.google-apps.unknown' | 'application/vnd.google-apps.video' | Expression<string>;
			/** Custom Mime Type
			 * @displayOptions.show { mimeType: ["custom"] }
			 */
			customMimeType?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Share a file */
export type GoogleDriveV1FileShareConfig = {
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
			role?: 'commenter' | 'fileOrganizer' | 'organizer' | 'owner' | 'reader' | 'writer' | Expression<string>;
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
export type GoogleDriveV1FileUpdateConfig = {
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
export type GoogleDriveV1FileUploadConfig = {
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
export type GoogleDriveV1FolderCreateConfig = {
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
export type GoogleDriveV1FolderDeleteConfig = {
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
export type GoogleDriveV1FolderShareConfig = {
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
			role?: 'commenter' | 'fileOrganizer' | 'organizer' | 'owner' | 'reader' | 'writer' | Expression<string>;
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

export type GoogleDriveV1Params =
	| GoogleDriveV1DriveCreateConfig
	| GoogleDriveV1DriveDeleteConfig
	| GoogleDriveV1DriveGetConfig
	| GoogleDriveV1DriveListConfig
	| GoogleDriveV1DriveUpdateConfig
	| GoogleDriveV1FileCopyConfig
	| GoogleDriveV1FileDeleteConfig
	| GoogleDriveV1FileDownloadConfig
	| GoogleDriveV1FileListConfig
	| GoogleDriveV1FileShareConfig
	| GoogleDriveV1FileUpdateConfig
	| GoogleDriveV1FileUploadConfig
	| GoogleDriveV1FolderCreateConfig
	| GoogleDriveV1FolderDeleteConfig
	| GoogleDriveV1FolderShareConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleDriveV1Credentials {
	googleApi: CredentialReference;
	googleDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleDriveV1NodeBase {
	type: 'n8n-nodes-base.googleDrive';
	version: 1;
	credentials?: GoogleDriveV1Credentials;
}

export type GoogleDriveV1DriveCreateNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1DriveCreateConfig>;
};

export type GoogleDriveV1DriveDeleteNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1DriveDeleteConfig>;
};

export type GoogleDriveV1DriveGetNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1DriveGetConfig>;
};

export type GoogleDriveV1DriveListNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1DriveListConfig>;
};

export type GoogleDriveV1DriveUpdateNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1DriveUpdateConfig>;
};

export type GoogleDriveV1FileCopyNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileCopyConfig>;
};

export type GoogleDriveV1FileDeleteNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileDeleteConfig>;
};

export type GoogleDriveV1FileDownloadNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileDownloadConfig>;
};

export type GoogleDriveV1FileListNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileListConfig>;
};

export type GoogleDriveV1FileShareNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileShareConfig>;
};

export type GoogleDriveV1FileUpdateNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileUpdateConfig>;
};

export type GoogleDriveV1FileUploadNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FileUploadConfig>;
};

export type GoogleDriveV1FolderCreateNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FolderCreateConfig>;
};

export type GoogleDriveV1FolderDeleteNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FolderDeleteConfig>;
};

export type GoogleDriveV1FolderShareNode = GoogleDriveV1NodeBase & {
	config: NodeConfig<GoogleDriveV1FolderShareConfig>;
};

export type GoogleDriveV1Node =
	| GoogleDriveV1DriveCreateNode
	| GoogleDriveV1DriveDeleteNode
	| GoogleDriveV1DriveGetNode
	| GoogleDriveV1DriveListNode
	| GoogleDriveV1DriveUpdateNode
	| GoogleDriveV1FileCopyNode
	| GoogleDriveV1FileDeleteNode
	| GoogleDriveV1FileDownloadNode
	| GoogleDriveV1FileListNode
	| GoogleDriveV1FileShareNode
	| GoogleDriveV1FileUpdateNode
	| GoogleDriveV1FileUploadNode
	| GoogleDriveV1FolderCreateNode
	| GoogleDriveV1FolderDeleteNode
	| GoogleDriveV1FolderShareNode
	;