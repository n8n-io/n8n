/**
 * Strapi Node Types
 *
 * Consume Strapi API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/strapi/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type StrapiV1Params =
	| StrapiV1EntryCreateConfig
	| StrapiV1EntryDeleteConfig
	| StrapiV1EntryGetConfig
	| StrapiV1EntryGetAllConfig
	| StrapiV1EntryUpdateConfig;

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

export type StrapiV1Node = {
	type: 'n8n-nodes-base.strapi';
	version: 1;
	config: NodeConfig<StrapiV1Params>;
	credentials?: StrapiV1Credentials;
};

export type StrapiNode = StrapiV1Node;
