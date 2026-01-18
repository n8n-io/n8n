/**
 * SeaTable Node - Version 2
 * Consume the SeaTable API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new row */
export type SeaTableV2RowCreateConfig = {
	resource: 'row';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { resource: ["row"], operation: ["create"] }
 * @default defineBelow
 */
		fieldsToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * Whether to use the column default values to populate new rows during creation (only available for normal backend)
 * @displayOptions.show { bigdata: [false], resource: ["row"], operation: ["create"] }
 * @default false
 */
		apply_default?: boolean | Expression<boolean>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { /fieldsToSend: ["autoMapInputData"], resource: ["row"], operation: ["create"] }
 */
		inputsToIgnore?: string | Expression<string>;
/**
 * Add destination column with its value. Provide the value in this way. Date: YYYY-MM-DD or YYYY-MM-DD hh:mm. Duration: time in seconds. Checkbox: true, on or 1. Multi-Select: comma-separated list.
 * @displayOptions.show { /fieldsToSend: ["defineBelow"], resource: ["row"], operation: ["create"] }
 * @default {}
 */
		columnsUi?: {
		columnValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			columnName?: string | Expression<string>;
			/** Column Value
			 */
			columnValue?: string | Expression<string>;
		}>;
	};
/**
 * Whether write to Big Data backend (true) or not (false). True requires the activation of the Big Data backend in the base.
 * @displayOptions.show { resource: ["row"], operation: ["create"] }
 * @default false
 */
		bigdata?: boolean | Expression<boolean>;
};

/** Delete a row */
export type SeaTableV2RowRemoveConfig = {
	resource: 'row';
	operation: 'remove';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
};

/** Get the content of a row */
export type SeaTableV2RowGetConfig = {
	resource: 'row';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many rows from a table or a table view */
export type SeaTableV2RowListConfig = {
	resource: 'row';
	operation: 'list';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
/**
 * The name of SeaTable view to access, or specify by using an expression. Provide it in the way "col.name:::col.type".
 * @displayOptions.show { resource: ["row"], operation: ["list"] }
 */
		viewName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Lock a row to prevent further changes */
export type SeaTableV2RowLockConfig = {
	resource: 'row';
	operation: 'lock';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
};

/** Search one or multiple rows */
export type SeaTableV2RowSearchConfig = {
	resource: 'row';
	operation: 'search';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
/**
 * Select the column to be searched. Not all column types are supported for search. Choose from the list, or specify a name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["row"], operation: ["search"] }
 */
		searchColumn: string | Expression<string>;
/**
 * What to look for?
 * @displayOptions.show { resource: ["row"], operation: ["search"] }
 */
		searchTerm: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Remove the lock from a row */
export type SeaTableV2RowUnlockConfig = {
	resource: 'row';
	operation: 'unlock';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
};

/** Update the content of a row */
export type SeaTableV2RowUpdateConfig = {
	resource: 'row';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["row"] }
 * @displayOptions.hide { operation: ["create", "list", "search"] }
 */
		rowId: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { resource: ["row"], operation: ["update"] }
 * @default defineBelow
 */
		fieldsToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { resource: ["row"], operation: ["update"], fieldsToSend: ["autoMapInputData"] }
 */
		inputsToIgnore?: string | Expression<string>;
/**
 * Add destination column with its value. Provide the value in this way:Date: YYYY-MM-DD or YYYY-MM-DD hh:mmDuration: time in secondsCheckbox: true, on or 1Multi-Select: comma-separated list.
 * @displayOptions.show { resource: ["row"], operation: ["update"], fieldsToSend: ["defineBelow"] }
 * @default {}
 */
		columnsUi?: {
		columnValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			columnName?: string | Expression<string>;
			/** Column Value
			 */
			columnValue?: string | Expression<string>;
		}>;
	};
};

/** Create a snapshot of the base */
export type SeaTableV2BaseSnapshotConfig = {
	resource: 'base';
	operation: 'snapshot';
};

/** Get the complete metadata of the base */
export type SeaTableV2BaseMetadataConfig = {
	resource: 'base';
	operation: 'metadata';
};

/** Get the username from the email or name of a collaborator */
export type SeaTableV2BaseCollaboratorConfig = {
	resource: 'base';
	operation: 'collaborator';
/**
 * SeaTable identifies users with a unique username like 244b43hr6fy54bb4afa2c2cb7369d244@auth.local. Get this username from an email or the name of a collaborator.
 * @displayOptions.show { resource: ["base"], operation: ["collaborator"] }
 */
		searchString: string | Expression<string>;
};

/** Create a link between two rows in a link column */
export type SeaTableV2LinkAddConfig = {
	resource: 'link';
	operation: 'add';
/**
 * Choose from the list, of specify by using an expression. Provide it in the way "table_name:::table_id".
 * @displayOptions.show { resource: ["link"], operation: ["add"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list of specify the Link Column by using an expression. You have to provide it in the way "column_name:::link_id:::other_table_id".
 * @displayOptions.show { resource: ["link"], operation: ["add"] }
 */
		linkColumn: string | Expression<string>;
/**
 * Provide the row ID of table you selected
 * @displayOptions.show { resource: ["link"], operation: ["add"] }
 */
		linkColumnSourceId: string | Expression<string>;
/**
 * Provide the row ID of table you want to link
 * @displayOptions.show { resource: ["link"], operation: ["add"] }
 */
		linkColumnTargetId: string | Expression<string>;
};

/** Get many rows from a table or a table view */
export type SeaTableV2LinkListConfig = {
	resource: 'link';
	operation: 'list';
/**
 * Choose from the list, of specify by using an expression. Provide it in the way "table_name:::table_id".
 * @displayOptions.show { resource: ["link"], operation: ["list"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list of specify the Link Column by using an expression. You have to provide it in the way "column_name:::link_id:::other_table_id:::column_key".
 * @displayOptions.show { resource: ["link"], operation: ["list"] }
 */
		linkColumn: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["link"], operation: ["list"] }
 */
		rowId: string | Expression<string>;
};

/** Delete a row */
export type SeaTableV2LinkRemoveConfig = {
	resource: 'link';
	operation: 'remove';
/**
 * Choose from the list, of specify by using an expression. Provide it in the way "table_name:::table_id".
 * @displayOptions.show { resource: ["link"], operation: ["remove"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list of specify the Link Column by using an expression. You have to provide it in the way "column_name:::link_id:::other_table_id".
 * @displayOptions.show { resource: ["link"], operation: ["remove"] }
 */
		linkColumn: string | Expression<string>;
/**
 * Provide the row ID of table you selected
 * @displayOptions.show { resource: ["link"], operation: ["remove"] }
 */
		linkColumnSourceId: string | Expression<string>;
/**
 * Provide the row ID of table you want to link
 * @displayOptions.show { resource: ["link"], operation: ["remove"] }
 */
		linkColumnTargetId: string | Expression<string>;
};

/** Get the public URL from asset path */
export type SeaTableV2AssetGetPublicURLConfig = {
	resource: 'asset';
	operation: 'getPublicURL';
	assetPath: string | Expression<string>;
};

/** Add a file/image to an existing row */
export type SeaTableV2AssetUploadConfig = {
	resource: 'asset';
	operation: 'upload';
/**
 * Choose from the list, or specify a name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["asset"], operation: ["upload"] }
 */
		tableName: string | Expression<string>;
/**
 * Choose from the list, or specify the name using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["asset"], operation: ["upload"] }
 */
		uploadColumn: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["asset"], operation: ["upload"] }
 */
		rowId: string | Expression<string>;
/**
 * Name of the binary property which contains the data for the file to be written
 * @displayOptions.show { resource: ["asset"], operation: ["upload"] }
 * @default data
 */
		dataPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SeaTableV2Params =
	| SeaTableV2RowCreateConfig
	| SeaTableV2RowRemoveConfig
	| SeaTableV2RowGetConfig
	| SeaTableV2RowListConfig
	| SeaTableV2RowLockConfig
	| SeaTableV2RowSearchConfig
	| SeaTableV2RowUnlockConfig
	| SeaTableV2RowUpdateConfig
	| SeaTableV2BaseSnapshotConfig
	| SeaTableV2BaseMetadataConfig
	| SeaTableV2BaseCollaboratorConfig
	| SeaTableV2LinkAddConfig
	| SeaTableV2LinkListConfig
	| SeaTableV2LinkRemoveConfig
	| SeaTableV2AssetGetPublicURLConfig
	| SeaTableV2AssetUploadConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SeaTableV2Credentials {
	seaTableApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SeaTableV2Node = {
	type: 'n8n-nodes-base.seaTable';
	version: 2;
	config: NodeConfig<SeaTableV2Params>;
	credentials?: SeaTableV2Credentials;
};