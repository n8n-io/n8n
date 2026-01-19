/**
 * Google Books Node - Version 1
 * Read data from Google Books
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve a specific bookshelf resource for the specified user */
export type GoogleBooksV1BookshelfGetConfig = {
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
export type GoogleBooksV1BookshelfGetAllConfig = {
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
export type GoogleBooksV1BookshelfVolumeAddConfig = {
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
export type GoogleBooksV1BookshelfVolumeClearConfig = {
	resource: 'bookshelfVolume';
	operation: 'clear';
/**
 * ID of the bookshelf
 * @displayOptions.show { operation: ["get", "add", "clear", "move", "remove"], resource: ["bookshelf", "bookshelfVolume"] }
 */
		shelfId: string | Expression<string>;
};

/** Get many public bookshelf resource for the specified user */
export type GoogleBooksV1BookshelfVolumeGetAllConfig = {
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
export type GoogleBooksV1BookshelfVolumeMoveConfig = {
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
export type GoogleBooksV1BookshelfVolumeRemoveConfig = {
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
export type GoogleBooksV1VolumeGetConfig = {
	resource: 'volume';
	operation: 'get';
/**
 * ID of the volume
 * @displayOptions.show { operation: ["add", "move", "remove", "get"], resource: ["bookshelfVolume", "volume"] }
 */
		volumeId: string | Expression<string>;
};

/** Get many public bookshelf resource for the specified user */
export type GoogleBooksV1VolumeGetAllConfig = {
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

export interface GoogleBooksV1Credentials {
	googleApi: CredentialReference;
	googleBooksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleBooksV1NodeBase {
	type: 'n8n-nodes-base.googleBooks';
	version: 1;
	credentials?: GoogleBooksV1Credentials;
}

export type GoogleBooksV1BookshelfGetNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfGetConfig>;
};

export type GoogleBooksV1BookshelfGetAllNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfGetAllConfig>;
};

export type GoogleBooksV1BookshelfVolumeAddNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfVolumeAddConfig>;
};

export type GoogleBooksV1BookshelfVolumeClearNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfVolumeClearConfig>;
};

export type GoogleBooksV1BookshelfVolumeGetAllNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfVolumeGetAllConfig>;
};

export type GoogleBooksV1BookshelfVolumeMoveNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfVolumeMoveConfig>;
};

export type GoogleBooksV1BookshelfVolumeRemoveNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1BookshelfVolumeRemoveConfig>;
};

export type GoogleBooksV1VolumeGetNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1VolumeGetConfig>;
};

export type GoogleBooksV1VolumeGetAllNode = GoogleBooksV1NodeBase & {
	config: NodeConfig<GoogleBooksV1VolumeGetAllConfig>;
};

export type GoogleBooksV1Node =
	| GoogleBooksV1BookshelfGetNode
	| GoogleBooksV1BookshelfGetAllNode
	| GoogleBooksV1BookshelfVolumeAddNode
	| GoogleBooksV1BookshelfVolumeClearNode
	| GoogleBooksV1BookshelfVolumeGetAllNode
	| GoogleBooksV1BookshelfVolumeMoveNode
	| GoogleBooksV1BookshelfVolumeRemoveNode
	| GoogleBooksV1VolumeGetNode
	| GoogleBooksV1VolumeGetAllNode
	;