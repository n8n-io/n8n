/**
 * Airtable Node Types
 *
 * Read, update, write and delete data from Airtable
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/airtable/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	id: string | Expression<string>;
	/**
	 * Additional options which decide which records should be returned
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
	 */
	filterByFormula?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Additional options which decide which records should be returned
	 * @default {}
	 */
	options?: Record<string, unknown>;
	/**
	 * Defines how the returned records should be ordered
	 * @default {}
	 */
	sort?: Record<string, unknown>;
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
	| AirtableV21RecordUpdateConfig;

export type AirtableV1AirtableTokenApiConfig = {
	authentication: 'airtableTokenApi';
	/**
	 * The Airtable Base in which to operate on
	 * @default {"mode":"url","value":""}
	 */
	application: ResourceLocatorValue;
	table: ResourceLocatorValue;
	/**
	 * Whether all fields should be sent to Airtable or only specific ones
	 * @default true
	 */
	addAllFields?: boolean | Expression<boolean>;
	/**
	 * The name of fields for which data should be sent to Airtable
	 * @default []
	 */
	fields: string | Expression<string>;
	/**
	 * ID of the record to delete
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether the attachment fields define in 'Download Fields' will be downloaded
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.
	 */
	downloadFieldNames: string | Expression<string>;
	/**
	 * Additional options which decide which records should be returned
	 * @default {}
	 */
	additionalOptions?: Record<string, unknown>;
	/**
	 * Whether all fields should be sent to Airtable or only specific ones
	 * @default true
	 */
	updateAllFields?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AirtableV1AirtableOAuth2ApiConfig = {
	authentication: 'airtableOAuth2Api';
	/**
	 * The Airtable Base in which to operate on
	 * @default {"mode":"url","value":""}
	 */
	application: ResourceLocatorValue;
	table: ResourceLocatorValue;
	/**
	 * Whether all fields should be sent to Airtable or only specific ones
	 * @default true
	 */
	addAllFields?: boolean | Expression<boolean>;
	/**
	 * The name of fields for which data should be sent to Airtable
	 * @default []
	 */
	fields: string | Expression<string>;
	/**
	 * ID of the record to delete
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether the attachment fields define in 'Download Fields' will be downloaded
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.
	 */
	downloadFieldNames: string | Expression<string>;
	/**
	 * Additional options which decide which records should be returned
	 * @default {}
	 */
	additionalOptions?: Record<string, unknown>;
	/**
	 * Whether all fields should be sent to Airtable or only specific ones
	 * @default true
	 */
	updateAllFields?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AirtableV1AirtableApiConfig = {
	authentication: 'airtableApi';
	/**
	 * The Airtable Base in which to operate on
	 * @default {"mode":"url","value":""}
	 */
	application: ResourceLocatorValue;
	table: ResourceLocatorValue;
	/**
	 * Whether all fields should be sent to Airtable or only specific ones
	 * @default true
	 */
	addAllFields?: boolean | Expression<boolean>;
	/**
	 * The name of fields for which data should be sent to Airtable
	 * @default []
	 */
	fields: string | Expression<string>;
	/**
	 * ID of the record to delete
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether the attachment fields define in 'Download Fields' will be downloaded
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.
	 */
	downloadFieldNames: string | Expression<string>;
	/**
	 * Additional options which decide which records should be returned
	 * @default {}
	 */
	additionalOptions?: Record<string, unknown>;
	/**
	 * Whether all fields should be sent to Airtable or only specific ones
	 * @default true
	 */
	updateAllFields?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type AirtableV1Params =
	| AirtableV1AirtableTokenApiConfig
	| AirtableV1AirtableOAuth2ApiConfig
	| AirtableV1AirtableApiConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AirtableV21Credentials {
	airtableTokenApi: CredentialReference;
	airtableOAuth2Api: CredentialReference;
}

export interface AirtableV1Credentials {
	airtableApi: CredentialReference;
	airtableTokenApi: CredentialReference;
	airtableOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AirtableV21Node = {
	type: 'n8n-nodes-base.airtable';
	version: 2 | 2.1;
	config: NodeConfig<AirtableV21Params>;
	credentials?: AirtableV21Credentials;
};

export type AirtableV1Node = {
	type: 'n8n-nodes-base.airtable';
	version: 1;
	config: NodeConfig<AirtableV1Params>;
	credentials?: AirtableV1Credentials;
};

export type AirtableNode = AirtableV21Node | AirtableV1Node;
