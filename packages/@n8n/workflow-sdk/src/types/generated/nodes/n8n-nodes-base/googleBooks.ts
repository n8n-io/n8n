/**
 * Google Books Node Types
 *
 * Read data from Google Books
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlebooks/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type GoogleBooksV2Params =
	| GoogleBooksV2BookshelfGetConfig
	| GoogleBooksV2BookshelfGetAllConfig
	| GoogleBooksV2BookshelfVolumeAddConfig
	| GoogleBooksV2BookshelfVolumeClearConfig
	| GoogleBooksV2BookshelfVolumeGetAllConfig
	| GoogleBooksV2BookshelfVolumeMoveConfig
	| GoogleBooksV2BookshelfVolumeRemoveConfig
	| GoogleBooksV2VolumeGetConfig
	| GoogleBooksV2VolumeGetAllConfig;

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

export type GoogleBooksV2Node = {
	type: 'n8n-nodes-base.googleBooks';
	version: 1 | 2;
	config: NodeConfig<GoogleBooksV2Params>;
	credentials?: GoogleBooksV2Credentials;
};

export type GoogleBooksNode = GoogleBooksV2Node;
