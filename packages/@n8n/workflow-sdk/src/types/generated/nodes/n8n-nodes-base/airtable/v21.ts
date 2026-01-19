/**
 * Airtable Node - Version 2.1
 * Read, update, write and delete data from Airtable
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** List all the bases */
export type AirtableV21BaseGetManyConfig = {
	resource: 'base';
	operation: 'getMany';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["base"], operation: ["getMany"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["base"], operation: ["getMany"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get the schema of the tables in a base */
export type AirtableV21BaseGetSchemaConfig = {
	resource: 'base';
	operation: 'getSchema';
/**
 * The Airtable Base to retrieve the schema from
 * @displayOptions.show { resource: ["base"], operation: ["getSchema"] }
 * @default {"mode":"list","value":""}
 */
		base: ResourceLocatorValue;
};

/** Create a new record in a table */
export type AirtableV21RecordCreateConfig = {
	resource: 'record';
	operation: 'create';
	base: ResourceLocatorValue;
	table: string | Expression<string>;
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type AirtableV21RecordUpsertConfig = {
	resource: 'record';
	operation: 'upsert';
	base: ResourceLocatorValue;
	table: string | Expression<string>;
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a record from a table */
export type AirtableV21RecordDeleteRecordConfig = {
	resource: 'record';
	operation: 'deleteRecord';
	base: ResourceLocatorValue;
	table: string | Expression<string>;
/**
 * ID of the record to delete. &lt;a href="https://support.airtable.com/docs/record-id" target="_blank"&gt;More info&lt;/a&gt;.
 * @displayOptions.show { resource: ["record"], operation: ["deleteRecord"] }
 */
		id: string | Expression<string>;
};

/** Retrieve a record from a table */
export type AirtableV21RecordGetConfig = {
	resource: 'record';
	operation: 'get';
	base: ResourceLocatorValue;
	table: string | Expression<string>;
/**
 * ID of the record to get. &lt;a href="https://support.airtable.com/docs/record-id" target="_blank"&gt;More info&lt;/a&gt;.
 * @displayOptions.show { resource: ["record"], operation: ["get"] }
 */
		id: string | Expression<string>;
/**
 * Additional options which decide which records should be returned
 * @displayOptions.show { resource: ["record"], operation: ["get"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

/** Search for specific records or list all */
export type AirtableV21RecordSearchConfig = {
	resource: 'record';
	operation: 'search';
	base: ResourceLocatorValue;
	table: string | Expression<string>;
/**
 * The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response. &lt;a href="https://support.airtable.com/docs/formula-field-reference" target="_blank"&gt;More info&lt;/a&gt;.
 * @hint If empty, all the records will be returned
 * @displayOptions.show { resource: ["record"], operation: ["search"] }
 */
		filterByFormula?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["record"], operation: ["search"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["record"], operation: ["search"] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Additional options which decide which records should be returned
 * @displayOptions.show { resource: ["record"], operation: ["search"] }
 * @default {}
 */
		options?: Record<string, unknown>;
/**
 * Defines how the returned records should be ordered
 * @displayOptions.show { resource: ["record"], operation: ["search"] }
 * @default {}
 */
		sort?: {
		property?: Array<{
			/** Name of the field to sort on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			field?: string | Expression<string>;
			/** The sort direction
			 * @default asc
			 */
			direction?: 'asc' | 'desc' | Expression<string>;
		}>;
	};
};

/** Update a record in a table */
export type AirtableV21RecordUpdateConfig = {
	resource: 'record';
	operation: 'update';
	base: ResourceLocatorValue;
	table: string | Expression<string>;
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type AirtableV21Params =
	| AirtableV21BaseGetManyConfig
	| AirtableV21BaseGetSchemaConfig
	| AirtableV21RecordCreateConfig
	| AirtableV21RecordUpsertConfig
	| AirtableV21RecordDeleteRecordConfig
	| AirtableV21RecordGetConfig
	| AirtableV21RecordSearchConfig
	| AirtableV21RecordUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AirtableV21Credentials {
	airtableTokenApi: CredentialReference;
	airtableOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AirtableV21NodeBase {
	type: 'n8n-nodes-base.airtable';
	version: 2.1;
	credentials?: AirtableV21Credentials;
}

export type AirtableV21BaseGetManyNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21BaseGetManyConfig>;
};

export type AirtableV21BaseGetSchemaNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21BaseGetSchemaConfig>;
};

export type AirtableV21RecordCreateNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21RecordCreateConfig>;
};

export type AirtableV21RecordUpsertNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21RecordUpsertConfig>;
};

export type AirtableV21RecordDeleteRecordNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21RecordDeleteRecordConfig>;
};

export type AirtableV21RecordGetNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21RecordGetConfig>;
};

export type AirtableV21RecordSearchNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21RecordSearchConfig>;
};

export type AirtableV21RecordUpdateNode = AirtableV21NodeBase & {
	config: NodeConfig<AirtableV21RecordUpdateConfig>;
};

export type AirtableV21Node =
	| AirtableV21BaseGetManyNode
	| AirtableV21BaseGetSchemaNode
	| AirtableV21RecordCreateNode
	| AirtableV21RecordUpsertNode
	| AirtableV21RecordDeleteRecordNode
	| AirtableV21RecordGetNode
	| AirtableV21RecordSearchNode
	| AirtableV21RecordUpdateNode
	;