/**
 * Wordpress Node - Version 1
 * Consume Wordpress API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a post */
export type WordpressV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
/**
 * The title for the post
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a post */
export type WordpressV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
 */
		postId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type WordpressV1PostGetAllConfig = {
	resource: 'post';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["post"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a post */
export type WordpressV1PostUpdateConfig = {
	resource: 'post';
	operation: 'update';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["post"], operation: ["update"] }
 */
		postId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a post */
export type WordpressV1PageCreateConfig = {
	resource: 'page';
	operation: 'create';
/**
 * The title for the page
 * @displayOptions.show { resource: ["page"], operation: ["create"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a post */
export type WordpressV1PageGetConfig = {
	resource: 'page';
	operation: 'get';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["page"], operation: ["get"] }
 */
		pageId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type WordpressV1PageGetAllConfig = {
	resource: 'page';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["page"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["page"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a post */
export type WordpressV1PageUpdateConfig = {
	resource: 'page';
	operation: 'update';
/**
 * Unique identifier for the object
 * @displayOptions.show { resource: ["page"], operation: ["update"] }
 */
		pageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a post */
export type WordpressV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * Login name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		username: string | Expression<string>;
/**
 * Display name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * First name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		firstName: string | Expression<string>;
/**
 * Last name for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		lastName: string | Expression<string>;
/**
 * The email address for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		email: string | Expression<string>;
/**
 * Password for the user (never included)
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		password: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a post */
export type WordpressV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Unique identifier for the user
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		userId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type WordpressV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a post */
export type WordpressV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * Unique identifier for the user
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		userId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type WordpressV1Params =
	| WordpressV1PostCreateConfig
	| WordpressV1PostGetConfig
	| WordpressV1PostGetAllConfig
	| WordpressV1PostUpdateConfig
	| WordpressV1PageCreateConfig
	| WordpressV1PageGetConfig
	| WordpressV1PageGetAllConfig
	| WordpressV1PageUpdateConfig
	| WordpressV1UserCreateConfig
	| WordpressV1UserGetConfig
	| WordpressV1UserGetAllConfig
	| WordpressV1UserUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WordpressV1Credentials {
	wordpressApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WordpressV1Node = {
	type: 'n8n-nodes-base.wordpress';
	version: 1;
	config: NodeConfig<WordpressV1Params>;
	credentials?: WordpressV1Credentials;
};