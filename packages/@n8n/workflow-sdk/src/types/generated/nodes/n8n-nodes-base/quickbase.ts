/**
 * Quick Base Node Types
 *
 * Integrate with the Quick Base RESTful API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/quickbase/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many fields */
export type QuickbaseV1FieldGetAllConfig = {
	resource: 'field';
	operation: 'getAll';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Delete a file */
export type QuickbaseV1FileDeleteConfig = {
	resource: 'file';
	operation: 'delete';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * The unique identifier of the record
	 */
	recordId: string | Expression<string>;
	/**
	 * The unique identifier of the field
	 */
	fieldId: string | Expression<string>;
	/**
	 * The file attachment version number
	 * @default 1
	 */
	versionNumber: number | Expression<number>;
};

/** Download a file */
export type QuickbaseV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * The unique identifier of the record
	 */
	recordId: string | Expression<string>;
	/**
	 * The unique identifier of the field
	 */
	fieldId: string | Expression<string>;
	/**
	 * The file attachment version number
	 * @default 1
	 */
	versionNumber: number | Expression<number>;
	binaryPropertyName: string | Expression<string>;
};

/** Create a record */
export type QuickbaseV1RecordCreateConfig = {
	resource: 'record';
	operation: 'create';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 */
	columns: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type QuickbaseV1RecordUpsertConfig = {
	resource: 'record';
	operation: 'upsert';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 */
	columns: string | Expression<string>;
	/**
	 * Update can use the key field on the table, or any other supported unique field
	 */
	updateKey?: string | Expression<string>;
	/**
	 * &lt;p&gt;You're updating records in a Quick Base table with data from an external file. In order for a merge like this to work, Quick Base needs a way to match records in the source data with corresponding records in the destination table.&lt;/p&gt;&lt;p&gt;You make this possible by choosing the field in the app table that holds unique matching values. This is called a merge field.&lt;/p&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	mergeFieldId?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Delete a file */
export type QuickbaseV1RecordDeleteConfig = {
	resource: 'record';
	operation: 'delete';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * The filter to delete records. To delete all records specify a filter that will include all records, for example {3.GT.0} where 3 is the ID of the Record ID field.
	 */
	where: string | Expression<string>;
};

/** Get many fields */
export type QuickbaseV1RecordGetAllConfig = {
	resource: 'record';
	operation: 'getAll';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Update a record */
export type QuickbaseV1RecordUpdateConfig = {
	resource: 'record';
	operation: 'update';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * Comma-separated list of the properties which should used as columns for the new rows
	 */
	columns: string | Expression<string>;
	/**
	 * Update can use the key field on the table, or any other supported unique field
	 */
	updateKey?: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Get a report */
export type QuickbaseV1ReportGetConfig = {
	resource: 'report';
	operation: 'get';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * The identifier of the report, unique to the table
	 */
	reportId: string | Expression<string>;
};

/** Run a report */
export type QuickbaseV1ReportRunConfig = {
	resource: 'report';
	operation: 'run';
	/**
	 * The table identifier
	 */
	tableId: string | Expression<string>;
	/**
	 * The identifier of the report, unique to the table
	 */
	reportId: string | Expression<string>;
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
};

export type QuickbaseV1Params =
	| QuickbaseV1FieldGetAllConfig
	| QuickbaseV1FileDeleteConfig
	| QuickbaseV1FileDownloadConfig
	| QuickbaseV1RecordCreateConfig
	| QuickbaseV1RecordUpsertConfig
	| QuickbaseV1RecordDeleteConfig
	| QuickbaseV1RecordGetAllConfig
	| QuickbaseV1RecordUpdateConfig
	| QuickbaseV1ReportGetConfig
	| QuickbaseV1ReportRunConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface QuickbaseV1Credentials {
	quickbaseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type QuickbaseV1Node = {
	type: 'n8n-nodes-base.quickbase';
	version: 1;
	config: NodeConfig<QuickbaseV1Params>;
	credentials?: QuickbaseV1Credentials;
};

export type QuickbaseNode = QuickbaseV1Node;
