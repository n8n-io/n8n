/**
 * Zammad Node Types
 *
 * Consume the Zammad API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/zammad/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a group */
export type ZammadV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
	/**
	 * Group to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
	/**
	 * Group to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a group */
export type ZammadV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
	/**
	 * Group to update. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a group */
export type ZammadV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1OrganizationDeleteConfig = {
	resource: 'organization';
	operation: 'delete';
	/**
	 * Organization to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
	/**
	 * Organization to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1OrganizationGetAllConfig = {
	resource: 'organization';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a group */
export type ZammadV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
	/**
	 * Organization to update. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a group */
export type ZammadV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	/**
	 * Title of the ticket to create
	 */
	title: string | Expression<string>;
	/**
	 * Group that will own the ticket to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	group: string | Expression<string>;
	/**
	 * Email address of the customer concerned in the ticket to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customer: string | Expression<string>;
	article: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	/**
	 * Ticket to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	/**
	 * Ticket to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Create a group */
export type ZammadV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	firstname: string | Expression<string>;
	lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type ZammadV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * User to delete. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Retrieve a group */
export type ZammadV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * User to retrieve. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
};

/** Get many groups */
export type ZammadV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Retrieve currently logged-in user */
export type ZammadV1UserGetSelfConfig = {
	resource: 'user';
	operation: 'getSelf';
};

/** Update a group */
export type ZammadV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * User to update. Specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ZammadV1Params =
	| ZammadV1GroupCreateConfig
	| ZammadV1GroupDeleteConfig
	| ZammadV1GroupGetConfig
	| ZammadV1GroupGetAllConfig
	| ZammadV1GroupUpdateConfig
	| ZammadV1OrganizationCreateConfig
	| ZammadV1OrganizationDeleteConfig
	| ZammadV1OrganizationGetConfig
	| ZammadV1OrganizationGetAllConfig
	| ZammadV1OrganizationUpdateConfig
	| ZammadV1TicketCreateConfig
	| ZammadV1TicketDeleteConfig
	| ZammadV1TicketGetConfig
	| ZammadV1TicketGetAllConfig
	| ZammadV1UserCreateConfig
	| ZammadV1UserDeleteConfig
	| ZammadV1UserGetConfig
	| ZammadV1UserGetAllConfig
	| ZammadV1UserGetSelfConfig
	| ZammadV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZammadV1Credentials {
	zammadBasicAuthApi: CredentialReference;
	zammadTokenAuthApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ZammadNode = {
	type: 'n8n-nodes-base.zammad';
	version: 1;
	config: NodeConfig<ZammadV1Params>;
	credentials?: ZammadV1Credentials;
};
