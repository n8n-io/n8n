/**
 * Affinity Node Types
 *
 * Consume Affinity API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/affinity/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a list */
export type AffinityV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
	/**
	 * The unique ID of the list object to be retrieved
	 */
	listId: string | Expression<string>;
};

/** Get many lists */
export type AffinityV1ListGetAllConfig = {
	resource: 'list';
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
};

/** Create a list entry */
export type AffinityV1ListEntryCreateConfig = {
	resource: 'listEntry';
	operation: 'create';
	/**
	 * The unique ID of the list whose list entries are to be retrieved. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The unique ID of the entity (person, organization, or opportunity) to add to this list
	 */
	entityId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a list entry */
export type AffinityV1ListEntryDeleteConfig = {
	resource: 'listEntry';
	operation: 'delete';
	/**
	 * The unique ID of the list that contains the specified list_entry_id. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The unique ID of the list entry object to be deleted
	 */
	listEntryId: string | Expression<string>;
};

/** Get a list */
export type AffinityV1ListEntryGetConfig = {
	resource: 'listEntry';
	operation: 'get';
	/**
	 * The unique ID of the list that contains the specified list_entry_id. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * The unique ID of the list entry object to be retrieved
	 */
	listEntryId: string | Expression<string>;
};

/** Get many lists */
export type AffinityV1ListEntryGetAllConfig = {
	resource: 'listEntry';
	operation: 'getAll';
	/**
	 * The unique ID of the list whose list entries are to be retrieved. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId?: string | Expression<string>;
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
};

/** Create a list entry */
export type AffinityV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
	/**
	 * The name of the organization
	 */
	name: string | Expression<string>;
	/**
	 * The domain name of the organization
	 */
	domain: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a list entry */
export type AffinityV1OrganizationDeleteConfig = {
	resource: 'organization';
	operation: 'delete';
	/**
	 * Unique identifier for the organization
	 */
	organizationId: string | Expression<string>;
};

/** Get a list */
export type AffinityV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
	/**
	 * Unique identifier for the organization
	 */
	organizationId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many lists */
export type AffinityV1OrganizationGetAllConfig = {
	resource: 'organization';
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

/** Update an organization */
export type AffinityV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
	/**
	 * Unique identifier for the organization
	 */
	organizationId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a list entry */
export type AffinityV1PersonCreateConfig = {
	resource: 'person';
	operation: 'create';
	/**
	 * The first name of the person
	 */
	firstName: string | Expression<string>;
	/**
	 * The last name of the person
	 */
	lastName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * The email addresses of the person
	 * @default []
	 */
	emails?: string | Expression<string>;
};

/** Delete a list entry */
export type AffinityV1PersonDeleteConfig = {
	resource: 'person';
	operation: 'delete';
	/**
	 * Unique identifier for the person
	 */
	personId: string | Expression<string>;
};

/** Get a list */
export type AffinityV1PersonGetConfig = {
	resource: 'person';
	operation: 'get';
	/**
	 * Unique identifier for the person
	 */
	personId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many lists */
export type AffinityV1PersonGetAllConfig = {
	resource: 'person';
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

/** Update an organization */
export type AffinityV1PersonUpdateConfig = {
	resource: 'person';
	operation: 'update';
	/**
	 * Unique identifier for the person
	 */
	personId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	/**
	 * The email addresses of the person
	 * @default []
	 */
	emails?: string | Expression<string>;
};

export type AffinityV1Params =
	| AffinityV1ListGetConfig
	| AffinityV1ListGetAllConfig
	| AffinityV1ListEntryCreateConfig
	| AffinityV1ListEntryDeleteConfig
	| AffinityV1ListEntryGetConfig
	| AffinityV1ListEntryGetAllConfig
	| AffinityV1OrganizationCreateConfig
	| AffinityV1OrganizationDeleteConfig
	| AffinityV1OrganizationGetConfig
	| AffinityV1OrganizationGetAllConfig
	| AffinityV1OrganizationUpdateConfig
	| AffinityV1PersonCreateConfig
	| AffinityV1PersonDeleteConfig
	| AffinityV1PersonGetConfig
	| AffinityV1PersonGetAllConfig
	| AffinityV1PersonUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AffinityV1Credentials {
	affinityApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AffinityNode = {
	type: 'n8n-nodes-base.affinity';
	version: 1;
	config: NodeConfig<AffinityV1Params>;
	credentials?: AffinityV1Credentials;
};
