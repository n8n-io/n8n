/**
 * Google Books Node - Version 2
 * Read data from Google Books
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve a specific bookshelf resource for the specified user */
export type GoogleBooksV2BookshelfGetConfig = {
	resource: 'bookshelf';
	operation: 'get';
	myLibrary: boolean | Expression<boolean>;
/**
 * ID of user
 * @displayOptions.show { operation: ["get", "getAll"], resource: ["bookshelf", "bookshelfVolume"] }
 * @displayOptions.hide { myLibrary: [true] }
 */
		userId: string | Expression<string>;
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["get", "add", "clear", "move", "remove"], resource: ["bookshelf", "bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
};

/** Get many public bookshelf resource for the specified user */
export type GoogleBooksV2BookshelfGetAllConfig = {
	resource: 'bookshelf';
	operation: 'getAll';
	myLibrary: boolean | Expression<boolean>;
/**
 * ID of user
 * @displayOptions.show { operation: ["get", "getAll"], resource: ["bookshelf", "bookshelfVolume"] }
 * @displayOptions.hide { myLibrary: [true] }
 */
		userId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 40
 */
		limit?: number | Expression<number>;
};

/** Add a volume to a bookshelf */
export type GoogleBooksV2BookshelfVolumeAddConfig = {
	resource: 'bookshelfVolume';
	operation: 'add';
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["get", "add", "clear", "move", "remove"], resource: ["bookshelf", "bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
/**
 * ID of the volume
 * @displayOptions.show { operation: ["add", "move", "remove", "get"], resource: ["bookshelfVolume", "volume"] }
 */
		volumeId: string | Expression<string>;
};

/** Clears all volumes from a bookshelf */
export type GoogleBooksV2BookshelfVolumeClearConfig = {
	resource: 'bookshelfVolume';
	operation: 'clear';
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["get", "add", "clear", "move", "remove"], resource: ["bookshelf", "bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
};

/** Get many public bookshelf resource for the specified user */
export type GoogleBooksV2BookshelfVolumeGetAllConfig = {
	resource: 'bookshelfVolume';
	operation: 'getAll';
	myLibrary: boolean | Expression<boolean>;
/**
 * ID of user
 * @displayOptions.show { operation: ["get", "getAll"], resource: ["bookshelf", "bookshelfVolume"] }
 * @displayOptions.hide { myLibrary: [true] }
 */
		userId: string | Expression<string>;
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["getAll"], resource: ["bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 40
 */
		limit?: number | Expression<number>;
};

/** Moves a volume within a bookshelf */
export type GoogleBooksV2BookshelfVolumeMoveConfig = {
	resource: 'bookshelfVolume';
	operation: 'move';
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["get", "add", "clear", "move", "remove"], resource: ["bookshelf", "bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
/**
 * ID of the volume
 * @displayOptions.show { operation: ["add", "move", "remove", "get"], resource: ["bookshelfVolume", "volume"] }
 */
		volumeId: string | Expression<string>;
/**
 * Position on shelf to move the item (0 puts the item before the current first item, 1 puts it between the first and the second and so on)
 * @displayOptions.show { operation: ["move"], resource: ["bookshelfVolume"] }
 */
		volumePosition: string | Expression<string>;
};

/** Removes a volume from a bookshelf */
export type GoogleBooksV2BookshelfVolumeRemoveConfig = {
	resource: 'bookshelfVolume';
	operation: 'remove';
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["get", "add", "clear", "move", "remove"], resource: ["bookshelf", "bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
/**
 * ID of the volume
 * @displayOptions.show { operation: ["add", "move", "remove", "get"], resource: ["bookshelfVolume", "volume"] }
 */
		volumeId: string | Expression<string>;
};

/** Retrieve a specific bookshelf resource for the specified user */
export type GoogleBooksV2VolumeGetConfig = {
	resource: 'volume';
	operation: 'get';
/**
 * ID of the volume
 * @displayOptions.show { operation: ["add", "move", "remove", "get"], resource: ["bookshelfVolume", "volume"] }
 */
		volumeId: string | Expression<string>;
};

/** Get many public bookshelf resource for the specified user */
export type GoogleBooksV2VolumeGetAllConfig = {
	resource: 'volume';
	operation: 'getAll';
/**
 * Full-text search query string
 * @displayOptions.show { operation: ["getAll"], resource: ["volume"] }
 */
		searchQuery: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 40
 */
		limit?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleBooksV2Credentials {
	googleApi: CredentialReference;
	googleBooksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleBooksV2NodeBase {
	type: 'n8n-nodes-base.googleBooks';
	version: 2;
	credentials?: GoogleBooksV2Credentials;
}

export type GoogleBooksV2BookshelfGetNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfGetConfig>;
};

export type GoogleBooksV2BookshelfGetAllNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfGetAllConfig>;
};

export type GoogleBooksV2BookshelfVolumeAddNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfVolumeAddConfig>;
};

export type GoogleBooksV2BookshelfVolumeClearNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfVolumeClearConfig>;
};

export type GoogleBooksV2BookshelfVolumeGetAllNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfVolumeGetAllConfig>;
};

export type GoogleBooksV2BookshelfVolumeMoveNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfVolumeMoveConfig>;
};

export type GoogleBooksV2BookshelfVolumeRemoveNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2BookshelfVolumeRemoveConfig>;
};

export type GoogleBooksV2VolumeGetNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2VolumeGetConfig>;
};

export type GoogleBooksV2VolumeGetAllNode = GoogleBooksV2NodeBase & {
	config: NodeConfig<GoogleBooksV2VolumeGetAllConfig>;
};

export type GoogleBooksV2Node =
	| GoogleBooksV2BookshelfGetNode
	| GoogleBooksV2BookshelfGetAllNode
	| GoogleBooksV2BookshelfVolumeAddNode
	| GoogleBooksV2BookshelfVolumeClearNode
	| GoogleBooksV2BookshelfVolumeGetAllNode
	| GoogleBooksV2BookshelfVolumeMoveNode
	| GoogleBooksV2BookshelfVolumeRemoveNode
	| GoogleBooksV2VolumeGetNode
	| GoogleBooksV2VolumeGetAllNode
	;