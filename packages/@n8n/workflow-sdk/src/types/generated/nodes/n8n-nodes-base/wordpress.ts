/**
 * Wordpress Node Types
 *
 * Consume Wordpress API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/wordpress/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a post */
export type WordpressV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
	/**
	 * The title for the post
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	username: string | Expression<string>;
	/**
	 * Display name for the user
	 */
	name: string | Expression<string>;
	/**
	 * First name for the user
	 */
	firstName: string | Expression<string>;
	/**
	 * Last name for the user
	 */
	lastName: string | Expression<string>;
	/**
	 * The email address for the user
	 */
	email: string | Expression<string>;
	/**
	 * Password for the user (never included)
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	| WordpressV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WordpressV1Credentials {
	wordpressApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WordpressNode = {
	type: 'n8n-nodes-base.wordpress';
	version: 1;
	config: NodeConfig<WordpressV1Params>;
	credentials?: WordpressV1Credentials;
};
