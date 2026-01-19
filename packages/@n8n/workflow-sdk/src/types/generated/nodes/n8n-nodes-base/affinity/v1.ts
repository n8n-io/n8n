/**
 * Affinity Node - Version 1
 * Consume Affinity API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a list */
export type AffinityV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
/**
 * The unique ID of the list object to be retrieved
 * @displayOptions.show { resource: ["list"], operation: ["get"] }
 */
		listId: string | Expression<string>;
};

/** Get many lists */
export type AffinityV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["listEntry"], operation: ["create"] }
 */
		listId: string | Expression<string>;
/**
 * The unique ID of the entity (person, organization, or opportunity) to add to this list
 * @displayOptions.show { resource: ["listEntry"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["listEntry"], operation: ["delete"] }
 */
		listId: string | Expression<string>;
/**
 * The unique ID of the list entry object to be deleted
 * @displayOptions.show { resource: ["listEntry"], operation: ["delete"] }
 */
		listEntryId: string | Expression<string>;
};

/** Get a list */
export type AffinityV1ListEntryGetConfig = {
	resource: 'listEntry';
	operation: 'get';
/**
 * The unique ID of the list that contains the specified list_entry_id. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listEntry"], operation: ["get"] }
 */
		listId: string | Expression<string>;
/**
 * The unique ID of the list entry object to be retrieved
 * @displayOptions.show { resource: ["listEntry"], operation: ["get"] }
 */
		listEntryId: string | Expression<string>;
};

/** Get many lists */
export type AffinityV1ListEntryGetAllConfig = {
	resource: 'listEntry';
	operation: 'getAll';
/**
 * The unique ID of the list whose list entries are to be retrieved. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["listEntry"], operation: ["getAll"] }
 */
		listId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["listEntry"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["listEntry"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["organization"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * The domain name of the organization
 * @displayOptions.show { resource: ["organization"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["organization"], operation: ["delete"] }
 */
		organizationId: string | Expression<string>;
};

/** Get a list */
export type AffinityV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
/**
 * Unique identifier for the organization
 * @displayOptions.show { resource: ["organization"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["organization"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["organization"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["organization"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["person"], operation: ["create"] }
 */
		firstName: string | Expression<string>;
/**
 * The last name of the person
 * @displayOptions.show { resource: ["person"], operation: ["create"] }
 */
		lastName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * The email addresses of the person
 * @displayOptions.show { resource: ["person"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["person"], operation: ["delete"] }
 */
		personId: string | Expression<string>;
};

/** Get a list */
export type AffinityV1PersonGetConfig = {
	resource: 'person';
	operation: 'get';
/**
 * Unique identifier for the person
 * @displayOptions.show { resource: ["person"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["person"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["person"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["person"], operation: ["update"] }
 */
		personId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
/**
 * The email addresses of the person
 * @displayOptions.show { resource: ["person"], operation: ["update"] }
 * @default []
 */
		emails?: string | Expression<string>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type AffinityV1ListEntryCreateOutput = {
	created_at?: string;
	creator_id?: number;
	entity?: {
		crunchbase_uuid?: null;
		domain?: string;
		domains?: Array<string>;
		global?: boolean;
		id?: number;
		name?: string;
	};
	entity_id?: number;
	entity_type?: number;
	id?: number;
	list_id?: number;
};

export type AffinityV1ListEntryGetAllOutput = {
	created_at?: string;
	creator_id?: number;
	entity?: {
		crunchbase_uuid?: null;
		domains?: Array<string>;
		global?: boolean;
		id?: number;
		name?: string;
	};
	entity_id?: number;
	entity_type?: number;
	id?: number;
	list_id?: number;
};

export type AffinityV1OrganizationCreateOutput = {
	crunchbase_uuid?: null;
	domain?: string;
	domains?: Array<string>;
	global?: boolean;
	id?: number;
	name?: string;
	person_ids?: Array<number>;
};

export type AffinityV1OrganizationGetOutput = {
	crunchbase_uuid?: null;
	domain?: string;
	domains?: Array<string>;
	global?: boolean;
	id?: number;
	list_entries?: Array<{
		created_at?: string;
		creator_id?: number;
		entity_id?: number;
		entity_type?: number;
		id?: number;
		list_id?: number;
	}>;
	name?: string;
	person_ids?: Array<number>;
};

export type AffinityV1OrganizationGetAllOutput = {
	crunchbase_uuid?: null;
	domains?: Array<string>;
	global?: boolean;
	id?: number;
	name?: string;
};

export type AffinityV1PersonGetOutput = {
	emails?: Array<string>;
	first_name?: string;
	id?: number;
	last_name?: string;
	list_entries?: Array<{
		created_at?: string;
		creator_id?: number;
		entity_id?: number;
		entity_type?: number;
		id?: number;
		list_id?: number;
	}>;
	organization_ids?: Array<number>;
	type?: number;
};

export type AffinityV1PersonGetAllOutput = {
	emails?: Array<string>;
	first_name?: string;
	id?: number;
	last_name?: string;
	type?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface AffinityV1Credentials {
	affinityApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AffinityV1NodeBase {
	type: 'n8n-nodes-base.affinity';
	version: 1;
	credentials?: AffinityV1Credentials;
}

export type AffinityV1ListGetNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1ListGetConfig>;
};

export type AffinityV1ListGetAllNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1ListGetAllConfig>;
};

export type AffinityV1ListEntryCreateNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1ListEntryCreateConfig>;
	output?: AffinityV1ListEntryCreateOutput;
};

export type AffinityV1ListEntryDeleteNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1ListEntryDeleteConfig>;
};

export type AffinityV1ListEntryGetNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1ListEntryGetConfig>;
};

export type AffinityV1ListEntryGetAllNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1ListEntryGetAllConfig>;
	output?: AffinityV1ListEntryGetAllOutput;
};

export type AffinityV1OrganizationCreateNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1OrganizationCreateConfig>;
	output?: AffinityV1OrganizationCreateOutput;
};

export type AffinityV1OrganizationDeleteNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1OrganizationDeleteConfig>;
};

export type AffinityV1OrganizationGetNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1OrganizationGetConfig>;
	output?: AffinityV1OrganizationGetOutput;
};

export type AffinityV1OrganizationGetAllNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1OrganizationGetAllConfig>;
	output?: AffinityV1OrganizationGetAllOutput;
};

export type AffinityV1OrganizationUpdateNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1OrganizationUpdateConfig>;
};

export type AffinityV1PersonCreateNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1PersonCreateConfig>;
};

export type AffinityV1PersonDeleteNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1PersonDeleteConfig>;
};

export type AffinityV1PersonGetNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1PersonGetConfig>;
	output?: AffinityV1PersonGetOutput;
};

export type AffinityV1PersonGetAllNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1PersonGetAllConfig>;
	output?: AffinityV1PersonGetAllOutput;
};

export type AffinityV1PersonUpdateNode = AffinityV1NodeBase & {
	config: NodeConfig<AffinityV1PersonUpdateConfig>;
};

export type AffinityV1Node =
	| AffinityV1ListGetNode
	| AffinityV1ListGetAllNode
	| AffinityV1ListEntryCreateNode
	| AffinityV1ListEntryDeleteNode
	| AffinityV1ListEntryGetNode
	| AffinityV1ListEntryGetAllNode
	| AffinityV1OrganizationCreateNode
	| AffinityV1OrganizationDeleteNode
	| AffinityV1OrganizationGetNode
	| AffinityV1OrganizationGetAllNode
	| AffinityV1OrganizationUpdateNode
	| AffinityV1PersonCreateNode
	| AffinityV1PersonDeleteNode
	| AffinityV1PersonGetNode
	| AffinityV1PersonGetAllNode
	| AffinityV1PersonUpdateNode
	;