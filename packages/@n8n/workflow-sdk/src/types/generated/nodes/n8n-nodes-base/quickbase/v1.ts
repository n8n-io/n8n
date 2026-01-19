/**
 * Quick Base Node - Version 1
 * Integrate with the Quick Base RESTful API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many fields */
export type QuickbaseV1FieldGetAllConfig = {
	resource: 'field';
	operation: 'getAll';
/**
 * The table identifier
 * @displayOptions.show { resource: ["field"], operation: ["getAll"] }
 */
		tableId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["field"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["field"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
 */
		tableId: string | Expression<string>;
/**
 * The unique identifier of the record
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
 */
		recordId: string | Expression<string>;
/**
 * The unique identifier of the field
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
 */
		fieldId: string | Expression<string>;
/**
 * The file attachment version number
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
 */
		tableId: string | Expression<string>;
/**
 * The unique identifier of the record
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
 */
		recordId: string | Expression<string>;
/**
 * The unique identifier of the field
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
 */
		fieldId: string | Expression<string>;
/**
 * The file attachment version number
 * @displayOptions.show { resource: ["file"], operation: ["download", "delete"] }
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
 * @displayOptions.show { resource: ["record"], operation: ["create"] }
 */
		tableId: string | Expression<string>;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { resource: ["record"], operation: ["create"] }
 */
		columns: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["record"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["record"], operation: ["upsert"] }
 */
		tableId: string | Expression<string>;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { resource: ["record"], operation: ["upsert"] }
 */
		columns: string | Expression<string>;
/**
 * Update can use the key field on the table, or any other supported unique field
 * @displayOptions.show { resource: ["record"], operation: ["upsert"] }
 */
		updateKey?: string | Expression<string>;
/**
 * &lt;p&gt;You're updating records in a Quick Base table with data from an external file. In order for a merge like this to work, Quick Base needs a way to match records in the source data with corresponding records in the destination table.&lt;/p&gt;&lt;p&gt;You make this possible by choosing the field in the app table that holds unique matching values. This is called a merge field.&lt;/p&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["record"], operation: ["upsert"] }
 */
		mergeFieldId?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["record"], operation: ["upsert"] }
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
 * @displayOptions.show { resource: ["record"], operation: ["delete"] }
 */
		tableId: string | Expression<string>;
/**
 * The filter to delete records. To delete all records specify a filter that will include all records, for example {3.GT.0} where 3 is the ID of the Record ID field.
 * @displayOptions.show { resource: ["record"], operation: ["delete"] }
 */
		where: string | Expression<string>;
};

/** Get many fields */
export type QuickbaseV1RecordGetAllConfig = {
	resource: 'record';
	operation: 'getAll';
/**
 * The table identifier
 * @displayOptions.show { resource: ["record"], operation: ["getAll"] }
 */
		tableId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["record"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["record"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["record"], operation: ["update"] }
 */
		tableId: string | Expression<string>;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { resource: ["record"], operation: ["update"] }
 */
		columns: string | Expression<string>;
/**
 * Update can use the key field on the table, or any other supported unique field
 * @displayOptions.show { resource: ["record"], operation: ["update"] }
 */
		updateKey?: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["record"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["report"], operation: ["get"] }
 */
		tableId: string | Expression<string>;
/**
 * The identifier of the report, unique to the table
 * @displayOptions.show { resource: ["report"], operation: ["get"] }
 */
		reportId: string | Expression<string>;
};

/** Run a report */
export type QuickbaseV1ReportRunConfig = {
	resource: 'report';
	operation: 'run';
/**
 * The table identifier
 * @displayOptions.show { resource: ["report"], operation: ["run"] }
 */
		tableId: string | Expression<string>;
/**
 * The identifier of the report, unique to the table
 * @displayOptions.show { resource: ["report"], operation: ["run"] }
 */
		reportId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["report"], operation: ["run"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["report"], operation: ["run"] }
 * @displayOptions.hide { returnAll: [true] }
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
	| QuickbaseV1ReportRunConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type QuickbaseV1RecordCreateOutput = {
	'3'?: number;
};

export type QuickbaseV1RecordGetAllOutput = {
	'Date Modified'?: string;
	NSN?: string;
	Status?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface QuickbaseV1Credentials {
	quickbaseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface QuickbaseV1NodeBase {
	type: 'n8n-nodes-base.quickbase';
	version: 1;
	credentials?: QuickbaseV1Credentials;
}

export type QuickbaseV1FieldGetAllNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1FieldGetAllConfig>;
};

export type QuickbaseV1FileDeleteNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1FileDeleteConfig>;
};

export type QuickbaseV1FileDownloadNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1FileDownloadConfig>;
};

export type QuickbaseV1RecordCreateNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1RecordCreateConfig>;
	output?: QuickbaseV1RecordCreateOutput;
};

export type QuickbaseV1RecordUpsertNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1RecordUpsertConfig>;
};

export type QuickbaseV1RecordDeleteNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1RecordDeleteConfig>;
};

export type QuickbaseV1RecordGetAllNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1RecordGetAllConfig>;
	output?: QuickbaseV1RecordGetAllOutput;
};

export type QuickbaseV1RecordUpdateNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1RecordUpdateConfig>;
};

export type QuickbaseV1ReportGetNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1ReportGetConfig>;
};

export type QuickbaseV1ReportRunNode = QuickbaseV1NodeBase & {
	config: NodeConfig<QuickbaseV1ReportRunConfig>;
};

export type QuickbaseV1Node =
	| QuickbaseV1FieldGetAllNode
	| QuickbaseV1FileDeleteNode
	| QuickbaseV1FileDownloadNode
	| QuickbaseV1RecordCreateNode
	| QuickbaseV1RecordUpsertNode
	| QuickbaseV1RecordDeleteNode
	| QuickbaseV1RecordGetAllNode
	| QuickbaseV1RecordUpdateNode
	| QuickbaseV1ReportGetNode
	| QuickbaseV1ReportRunNode
	;