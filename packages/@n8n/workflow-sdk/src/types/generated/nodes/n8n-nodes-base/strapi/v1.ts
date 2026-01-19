/**
 * Strapi Node - Version 1
 * Consume Strapi API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an entry */
export type StrapiV1EntryCreateConfig = {
	resource: 'entry';
	operation: 'create';
/**
 * Name of the content type
 * @displayOptions.show { resource: ["entry"], operation: ["create"] }
 */
		contentType: string | Expression<string>;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { resource: ["entry"], operation: ["create"] }
 */
		columns?: string | Expression<string>;
};

/** Delete an entry */
export type StrapiV1EntryDeleteConfig = {
	resource: 'entry';
	operation: 'delete';
/**
 * Name of the content type
 * @displayOptions.show { resource: ["entry"], operation: ["delete"] }
 */
		contentType: string | Expression<string>;
/**
 * The ID of the entry to delete
 * @displayOptions.show { resource: ["entry"], operation: ["delete"] }
 */
		entryId: string | Expression<string>;
};

/** Get an entry */
export type StrapiV1EntryGetConfig = {
	resource: 'entry';
	operation: 'get';
/**
 * Name of the content type
 * @displayOptions.show { resource: ["entry"], operation: ["get"] }
 */
		contentType: string | Expression<string>;
/**
 * The ID of the entry to get
 * @displayOptions.show { resource: ["entry"], operation: ["get"] }
 */
		entryId: string | Expression<string>;
};

/** Get many entries */
export type StrapiV1EntryGetAllConfig = {
	resource: 'entry';
	operation: 'getAll';
/**
 * Name of the content type
 * @displayOptions.show { resource: ["entry"], operation: ["getAll"] }
 */
		contentType: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["entry"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["entry"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an entry */
export type StrapiV1EntryUpdateConfig = {
	resource: 'entry';
	operation: 'update';
/**
 * Name of the content type
 * @displayOptions.show { resource: ["entry"], operation: ["update"] }
 */
		contentType: string | Expression<string>;
/**
 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
 * @displayOptions.show { resource: ["entry"], operation: ["update"] }
 * @default id
 */
		updateKey: string | Expression<string>;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { resource: ["entry"], operation: ["update"] }
 */
		columns?: string | Expression<string>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type StrapiV1EntryGetOutput = {
	attributes?: {
		content?: string;
		createdAt?: string;
		heading?: string;
		primaryText?: string;
		slug?: string;
		updatedAt?: string;
	};
	id?: number;
};

export type StrapiV1EntryGetAllOutput = {
	createdAt?: string;
	documentId?: string;
	id?: number;
	publishedAt?: string;
	updatedAt?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface StrapiV1Credentials {
	strapiApi: CredentialReference;
	strapiTokenApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface StrapiV1NodeBase {
	type: 'n8n-nodes-base.strapi';
	version: 1;
	credentials?: StrapiV1Credentials;
}

export type StrapiV1EntryCreateNode = StrapiV1NodeBase & {
	config: NodeConfig<StrapiV1EntryCreateConfig>;
};

export type StrapiV1EntryDeleteNode = StrapiV1NodeBase & {
	config: NodeConfig<StrapiV1EntryDeleteConfig>;
};

export type StrapiV1EntryGetNode = StrapiV1NodeBase & {
	config: NodeConfig<StrapiV1EntryGetConfig>;
	output?: StrapiV1EntryGetOutput;
};

export type StrapiV1EntryGetAllNode = StrapiV1NodeBase & {
	config: NodeConfig<StrapiV1EntryGetAllConfig>;
	output?: StrapiV1EntryGetAllOutput;
};

export type StrapiV1EntryUpdateNode = StrapiV1NodeBase & {
	config: NodeConfig<StrapiV1EntryUpdateConfig>;
};

export type StrapiV1Node =
	| StrapiV1EntryCreateNode
	| StrapiV1EntryDeleteNode
	| StrapiV1EntryGetNode
	| StrapiV1EntryGetAllNode
	| StrapiV1EntryUpdateNode
	;