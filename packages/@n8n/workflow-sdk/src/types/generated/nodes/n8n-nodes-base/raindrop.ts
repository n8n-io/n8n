/**
 * Raindrop Node Types
 *
 * Consume the Raindrop API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/raindrop/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	| RaindropV1UserGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface RaindropV1Credentials {
	raindropOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type RaindropV1Node = {
	type: 'n8n-nodes-base.raindrop';
	version: 1;
	config: NodeConfig<RaindropV1Params>;
	credentials?: RaindropV1Credentials;
};

export type RaindropNode = RaindropV1Node;
