/**
 * Raindrop Node - Version 1
 * Consume the Raindrop API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type RaindropV1BookmarkCreateConfig = {
	resource: 'bookmark';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["bookmark"], operation: ["create"] }
 */
		collectionId?: string | Expression<string>;
/**
 * Link of the bookmark to be created
 * @displayOptions.show { resource: ["bookmark"], operation: ["create"] }
 */
		link: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type RaindropV1BookmarkDeleteConfig = {
	resource: 'bookmark';
	operation: 'delete';
/**
 * The ID of the bookmark to delete
 * @displayOptions.show { resource: ["bookmark"], operation: ["delete"] }
 */
		bookmarkId: string | Expression<string>;
};

export type RaindropV1BookmarkGetConfig = {
	resource: 'bookmark';
	operation: 'get';
/**
 * The ID of the bookmark to retrieve
 * @displayOptions.show { resource: ["bookmark"], operation: ["get"] }
 */
		bookmarkId: string | Expression<string>;
};

export type RaindropV1BookmarkGetAllConfig = {
	resource: 'bookmark';
	operation: 'getAll';
/**
 * The ID of the collection from which to retrieve all bookmarks. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["bookmark"], operation: ["getAll"] }
 * @default []
 */
		collectionId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["bookmark"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["bookmark"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
};

export type RaindropV1BookmarkUpdateConfig = {
	resource: 'bookmark';
	operation: 'update';
/**
 * The ID of the bookmark to update
 * @displayOptions.show { resource: ["bookmark"], operation: ["update"] }
 */
		bookmarkId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type RaindropV1CollectionCreateConfig = {
	resource: 'collection';
	operation: 'create';
/**
 * Title of the collection to create
 * @displayOptions.show { resource: ["collection"], operation: ["create"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type RaindropV1CollectionDeleteConfig = {
	resource: 'collection';
	operation: 'delete';
/**
 * The ID of the collection to delete
 * @displayOptions.show { resource: ["collection"], operation: ["delete"] }
 */
		collectionId: string | Expression<string>;
};

export type RaindropV1CollectionGetConfig = {
	resource: 'collection';
	operation: 'get';
/**
 * The ID of the collection to retrieve
 * @displayOptions.show { resource: ["collection"], operation: ["get"] }
 */
		collectionId: string | Expression<string>;
};

export type RaindropV1CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
	type: 'parent' | 'children' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["collection"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
};

export type RaindropV1CollectionUpdateConfig = {
	resource: 'collection';
	operation: 'update';
/**
 * The ID of the collection to update
 * @displayOptions.show { resource: ["collection"], operation: ["update"] }
 */
		collectionId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type RaindropV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
/**
 * One or more tags to delete. Enter comma-separated values to delete multiple tags.
 * @displayOptions.show { resource: ["tag"], operation: ["delete"] }
 */
		tags: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type RaindropV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["tag"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["tag"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type RaindropV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Whether to return details on the logged-in user
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default true
 */
		self: boolean | Expression<boolean>;
/**
 * The ID of the user to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["get"], self: [false] }
 */
		userId: string | Expression<string>;
};

export type RaindropV1Params =
	| RaindropV1BookmarkCreateConfig
	| RaindropV1BookmarkDeleteConfig
	| RaindropV1BookmarkGetConfig
	| RaindropV1BookmarkGetAllConfig
	| RaindropV1BookmarkUpdateConfig
	| RaindropV1CollectionCreateConfig
	| RaindropV1CollectionDeleteConfig
	| RaindropV1CollectionGetConfig
	| RaindropV1CollectionGetAllConfig
	| RaindropV1CollectionUpdateConfig
	| RaindropV1TagDeleteConfig
	| RaindropV1TagGetAllConfig
	| RaindropV1UserGetConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type RaindropV1BookmarkGetAllOutput = {
	_id?: number;
	collection?: {
		$id?: number;
		$ref?: string;
		oid?: number;
	};
	collectionId?: number;
	cover?: string;
	created?: string;
	creatorRef?: {
		_id?: number;
		avatar?: string;
		email?: string;
		name?: string;
	};
	domain?: string;
	excerpt?: string;
	highlights?: Array<{
		_id?: string;
		color?: string;
		created?: string;
		creatorRef?: number;
		lastUpdate?: string;
		note?: string;
		text?: string;
	}>;
	important?: boolean;
	lastUpdate?: string;
	link?: string;
	media?: Array<{
		link?: string;
		type?: string;
	}>;
	note?: string;
	reminder?: {
		date?: null;
	};
	removed?: boolean;
	sort?: number;
	tags?: Array<string>;
	title?: string;
	type?: string;
	user?: {
		$id?: number;
		$ref?: string;
	};
};

export type RaindropV1CollectionGetAllOutput = {
	_id?: number;
	access?: {
		draggable?: boolean;
		'for'?: number;
		level?: number;
		root?: boolean;
	};
	author?: boolean;
	color?: string;
	count?: number;
	cover?: Array<string>;
	created?: string;
	creatorRef?: {
		_id?: number;
		email?: string;
		name?: string;
	};
	description?: string;
	expanded?: boolean;
	lastAction?: string;
	lastUpdate?: string;
	public?: boolean;
	slug?: string;
	sort?: number;
	title?: string;
	user?: {
		$id?: number;
		$ref?: string;
	};
	view?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface RaindropV1Credentials {
	raindropOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RaindropV1NodeBase {
	type: 'n8n-nodes-base.raindrop';
	version: 1;
	credentials?: RaindropV1Credentials;
}

export type RaindropV1BookmarkCreateNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1BookmarkCreateConfig>;
};

export type RaindropV1BookmarkDeleteNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1BookmarkDeleteConfig>;
};

export type RaindropV1BookmarkGetNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1BookmarkGetConfig>;
};

export type RaindropV1BookmarkGetAllNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1BookmarkGetAllConfig>;
	output?: RaindropV1BookmarkGetAllOutput;
};

export type RaindropV1BookmarkUpdateNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1BookmarkUpdateConfig>;
};

export type RaindropV1CollectionCreateNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1CollectionCreateConfig>;
};

export type RaindropV1CollectionDeleteNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1CollectionDeleteConfig>;
};

export type RaindropV1CollectionGetNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1CollectionGetConfig>;
};

export type RaindropV1CollectionGetAllNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1CollectionGetAllConfig>;
	output?: RaindropV1CollectionGetAllOutput;
};

export type RaindropV1CollectionUpdateNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1CollectionUpdateConfig>;
};

export type RaindropV1TagDeleteNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1TagDeleteConfig>;
};

export type RaindropV1TagGetAllNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1TagGetAllConfig>;
};

export type RaindropV1UserGetNode = RaindropV1NodeBase & {
	config: NodeConfig<RaindropV1UserGetConfig>;
};

export type RaindropV1Node =
	| RaindropV1BookmarkCreateNode
	| RaindropV1BookmarkDeleteNode
	| RaindropV1BookmarkGetNode
	| RaindropV1BookmarkGetAllNode
	| RaindropV1BookmarkUpdateNode
	| RaindropV1CollectionCreateNode
	| RaindropV1CollectionDeleteNode
	| RaindropV1CollectionGetNode
	| RaindropV1CollectionGetAllNode
	| RaindropV1CollectionUpdateNode
	| RaindropV1TagDeleteNode
	| RaindropV1TagGetAllNode
	| RaindropV1UserGetNode
	;