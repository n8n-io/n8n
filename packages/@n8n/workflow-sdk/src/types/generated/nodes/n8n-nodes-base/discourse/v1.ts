/**
 * Discourse Node - Version 1
 * Consume Discourse API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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


// ===========================================================================
// Credentials
// ===========================================================================

export interface DiscourseV1Credentials {
	discourseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface DiscourseV1NodeBase {
	type: 'n8n-nodes-base.discourse';
	version: 1;
	credentials?: DiscourseV1Credentials;
}

export type DiscourseV1CategoryCreateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1CategoryCreateConfig>;
};

export type DiscourseV1CategoryGetAllNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1CategoryGetAllConfig>;
};

export type DiscourseV1CategoryUpdateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1CategoryUpdateConfig>;
};

export type DiscourseV1GroupCreateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1GroupCreateConfig>;
};

export type DiscourseV1GroupGetNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1GroupGetConfig>;
};

export type DiscourseV1GroupGetAllNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1GroupGetAllConfig>;
};

export type DiscourseV1GroupUpdateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1GroupUpdateConfig>;
};

export type DiscourseV1PostCreateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1PostCreateConfig>;
};

export type DiscourseV1PostGetNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1PostGetConfig>;
};

export type DiscourseV1PostGetAllNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1PostGetAllConfig>;
};

export type DiscourseV1PostUpdateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1PostUpdateConfig>;
};

export type DiscourseV1UserCreateNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1UserCreateConfig>;
};

export type DiscourseV1UserGetNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1UserGetConfig>;
};

export type DiscourseV1UserGetAllNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1UserGetAllConfig>;
};

export type DiscourseV1UserGroupAddNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1UserGroupAddConfig>;
};

export type DiscourseV1UserGroupRemoveNode = DiscourseV1NodeBase & {
	config: NodeConfig<DiscourseV1UserGroupRemoveConfig>;
};

export type DiscourseV1Node =
	| DiscourseV1CategoryCreateNode
	| DiscourseV1CategoryGetAllNode
	| DiscourseV1CategoryUpdateNode
	| DiscourseV1GroupCreateNode
	| DiscourseV1GroupGetNode
	| DiscourseV1GroupGetAllNode
	| DiscourseV1GroupUpdateNode
	| DiscourseV1PostCreateNode
	| DiscourseV1PostGetNode
	| DiscourseV1PostGetAllNode
	| DiscourseV1PostUpdateNode
	| DiscourseV1UserCreateNode
	| DiscourseV1UserGetNode
	| DiscourseV1UserGetAllNode
	| DiscourseV1UserGroupAddNode
	| DiscourseV1UserGroupRemoveNode
	;