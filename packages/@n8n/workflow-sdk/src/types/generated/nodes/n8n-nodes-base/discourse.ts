/**
 * Discourse Node Types
 *
 * Consume Discourse API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/discourse/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a category */
export type DiscourseV1CategoryCreateConfig = {
	resource: 'category';
	operation: 'create';
	/**
	 * Name of the category
	 * @displayOptions.show { resource: ["category"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * Color of the category
	 * @displayOptions.show { resource: ["category"], operation: ["create"] }
	 * @default 0000FF
	 */
	color: string | Expression<string>;
	/**
	 * Text color of the category
	 * @displayOptions.show { resource: ["category"], operation: ["create"] }
	 * @default 0000FF
	 */
	textColor: string | Expression<string>;
};

/** Get many categories */
export type DiscourseV1CategoryGetAllConfig = {
	resource: 'category';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["category"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["category"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a category */
export type DiscourseV1CategoryUpdateConfig = {
	resource: 'category';
	operation: 'update';
	/**
	 * ID of the category
	 * @displayOptions.show { resource: ["category"], operation: ["update"] }
	 */
	categoryId: string | Expression<string>;
	/**
	 * New name of the category
	 * @displayOptions.show { resource: ["category"], operation: ["update"] }
	 */
	name: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a category */
export type DiscourseV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	/**
	 * Name of the group
	 * @displayOptions.show { resource: ["group"], operation: ["get", "create"] }
	 */
	name: string | Expression<string>;
};

/** Get a group */
export type DiscourseV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
	/**
	 * Name of the group
	 * @displayOptions.show { resource: ["group"], operation: ["get", "create"] }
	 */
	name: string | Expression<string>;
};

/** Get many categories */
export type DiscourseV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["group"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a category */
export type DiscourseV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
	/**
	 * ID of the group to update
	 * @displayOptions.show { resource: ["group"], operation: ["update"] }
	 */
	groupId: string | Expression<string>;
	/**
	 * New name of the group
	 * @displayOptions.show { resource: ["group"], operation: ["update"] }
	 */
	name: string | Expression<string>;
};

/** Create a category */
export type DiscourseV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
	/**
	 * Title of the post
	 * @displayOptions.show { resource: ["post"], operation: ["create"] }
	 */
	title?: string | Expression<string>;
	/**
	 * Content of the post
	 * @displayOptions.show { resource: ["post"], operation: ["create"] }
	 */
	content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a group */
export type DiscourseV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
	/**
	 * ID of the post
	 * @displayOptions.show { resource: ["post"], operation: ["get"] }
	 */
	postId: string | Expression<string>;
};

/** Get many categories */
export type DiscourseV1PostGetAllConfig = {
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
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a category */
export type DiscourseV1PostUpdateConfig = {
	resource: 'post';
	operation: 'update';
	/**
	 * ID of the post
	 * @displayOptions.show { resource: ["post"], operation: ["update"] }
	 */
	postId: string | Expression<string>;
	/**
	 * Content of the post. HTML is supported.
	 * @displayOptions.show { resource: ["post"], operation: ["update"] }
	 */
	content: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a category */
export type DiscourseV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * Name of the user to create
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * Email of the user to create
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	email: string | Expression<string>;
	/**
	 * The username of the user to create
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	username: string | Expression<string>;
	/**
	 * The password of the user to create
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	password: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a group */
export type DiscourseV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * What to search by
	 * @displayOptions.show { resource: ["user"], operation: ["get"] }
	 * @default username
	 */
	by: 'username' | 'externalId' | Expression<string>;
	/**
	 * The username of the user to return
	 * @displayOptions.show { resource: ["user"], operation: ["get"], by: ["username"] }
	 */
	username: string | Expression<string>;
	/**
	 * Discourse SSO external ID
	 * @displayOptions.show { resource: ["user"], operation: ["get"], by: ["externalId"] }
	 */
	externalId: string | Expression<string>;
};

/** Get many categories */
export type DiscourseV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * User flags to search for
	 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
	 */
	flag?: 'active' | 'blocked' | 'new' | 'staff' | 'suspect' | 'suspended' | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a user to group */
export type DiscourseV1UserGroupAddConfig = {
	resource: 'userGroup';
	operation: 'add';
	/**
	 * Usernames to add to group. Multiples can be defined separated by comma.
	 * @displayOptions.show { resource: ["userGroup"], operation: ["add"] }
	 */
	usernames: string | Expression<string>;
	/**
	 * ID of the group
	 * @displayOptions.show { resource: ["userGroup"], operation: ["add"] }
	 */
	groupId: string | Expression<string>;
};

/** Remove user from group */
export type DiscourseV1UserGroupRemoveConfig = {
	resource: 'userGroup';
	operation: 'remove';
	/**
	 * Usernames to remove from group. Multiples can be defined separated by comma.
	 * @displayOptions.show { resource: ["userGroup"], operation: ["remove"] }
	 */
	usernames: string | Expression<string>;
	/**
	 * ID of the group to remove
	 * @displayOptions.show { resource: ["userGroup"], operation: ["remove"] }
	 */
	groupId: string | Expression<string>;
};

export type DiscourseV1Params =
	| DiscourseV1CategoryCreateConfig
	| DiscourseV1CategoryGetAllConfig
	| DiscourseV1CategoryUpdateConfig
	| DiscourseV1GroupCreateConfig
	| DiscourseV1GroupGetConfig
	| DiscourseV1GroupGetAllConfig
	| DiscourseV1GroupUpdateConfig
	| DiscourseV1PostCreateConfig
	| DiscourseV1PostGetConfig
	| DiscourseV1PostGetAllConfig
	| DiscourseV1PostUpdateConfig
	| DiscourseV1UserCreateConfig
	| DiscourseV1UserGetConfig
	| DiscourseV1UserGetAllConfig
	| DiscourseV1UserGroupAddConfig
	| DiscourseV1UserGroupRemoveConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DiscourseV1Credentials {
	discourseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type DiscourseV1Node = {
	type: 'n8n-nodes-base.discourse';
	version: 1;
	config: NodeConfig<DiscourseV1Params>;
	credentials?: DiscourseV1Credentials;
};

export type DiscourseNode = DiscourseV1Node;
