/**
 * Data table Node Types
 *
 * Permanently save data across workflow executions in a table
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/datatable/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete row(s) */
export type DataTableV11RowDeleteRowsConfig = {
	resource: 'row';
	operation: 'deleteRows';
	dataTableId: ResourceLocatorValue;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @displayOptions.show { resource: ["row"], operation: ["deleteRows"] }
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Get row(s) */
export type DataTableV11RowGetConfig = {
	resource: 'row';
	operation: 'get';
	dataTableId: ResourceLocatorValue;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @displayOptions.show { resource: ["row"], operation: ["get"] }
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["row"], operation: ["get"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["row"], operation: ["get"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to sort the results by a column
	 * @displayOptions.show { resource: ["row"], operation: ["get"] }
	 * @default false
	 */
	orderBy?: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["row"], operation: ["get"], orderBy: [true] }
	 * @default createdAt
	 */
	orderByColumn?: string | Expression<string>;
	/**
	 * Sort direction for the column
	 * @displayOptions.show { resource: ["row"], operation: ["get"], orderBy: [true] }
	 * @default DESC
	 */
	orderByDirection?: 'ASC' | 'DESC' | Expression<string>;
};

/** Match input items that are in the data table */
export type DataTableV11RowRowExistsConfig = {
	resource: 'row';
	operation: 'rowExists';
	dataTableId: ResourceLocatorValue;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @displayOptions.show { resource: ["row"], operation: ["rowExists"] }
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @displayOptions.show { @version: [{"_cnd":{"lt":0}}] }
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
};

/** Match input items that are not in the data table */
export type DataTableV11RowRowNotExistsConfig = {
	resource: 'row';
	operation: 'rowNotExists';
	dataTableId: ResourceLocatorValue;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @displayOptions.show { resource: ["row"], operation: ["rowNotExists"] }
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @displayOptions.show { @version: [{"_cnd":{"lt":0}}] }
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
};

/** Insert a new row */
export type DataTableV11RowInsertConfig = {
	resource: 'row';
	operation: 'insert';
	dataTableId: ResourceLocatorValue;
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update row(s) matching certain fields */
export type DataTableV11RowUpdateConfig = {
	resource: 'row';
	operation: 'update';
	dataTableId: ResourceLocatorValue;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @displayOptions.show { resource: ["row"], operation: ["update"] }
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update row(s), or insert if there is no match */
export type DataTableV11RowUpsertConfig = {
	resource: 'row';
	operation: 'upsert';
	dataTableId: ResourceLocatorValue;
	matchType?: 'anyCondition' | 'allConditions' | Expression<string>;
	/**
	 * Filter to decide which rows get
	 * @displayOptions.show { resource: ["row"], operation: ["upsert"] }
	 * @default {}
	 */
	filters?: {
		conditions?: Array<{
			/** Choose from the list, or specify using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default id
			 */
			keyName?: string | Expression<string>;
			/** Condition
			 * @default eq
			 */
			condition?: string | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition: ["isEmpty", "isNotEmpty", "isTrue", "isFalse"] }
			 */
			keyValue?: string | Expression<string>;
		}>;
	};
	columns: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new data table */
export type DataTableV11TableCreateConfig = {
	resource: 'table';
	operation: 'create';
	/**
	 * The name of the data table to create
	 * @displayOptions.show { resource: ["table"], operation: ["create"] }
	 */
	tableName: string | Expression<string>;
	/**
	 * The columns to create in the data table
	 * @displayOptions.show { resource: ["table"], operation: ["create"] }
	 * @default {}
	 */
	columns?: {
		column?: Array<{
			/** The name of the column
			 */
			name?: string | Expression<string>;
			/** The type of the column
			 * @default string
			 */
			type?: 'boolean' | 'date' | 'number' | 'string' | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
};

/** Delete a data table */
export type DataTableV11TableDeleteConfig = {
	resource: 'table';
	operation: 'delete';
	dataTableId: ResourceLocatorValue;
};

/** List all data tables */
export type DataTableV11TableListConfig = {
	resource: 'table';
	operation: 'list';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["table"], operation: ["list"] }
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["table"], operation: ["list"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update row(s) matching certain fields */
export type DataTableV11TableUpdateConfig = {
	resource: 'table';
	operation: 'update';
	dataTableId: ResourceLocatorValue;
	/**
	 * The new name for the data table
	 * @displayOptions.show { resource: ["table"], operation: ["update"] }
	 */
	newName: string | Expression<string>;
};

export type DataTableV11Params =
	| DataTableV11RowDeleteRowsConfig
	| DataTableV11RowGetConfig
	| DataTableV11RowRowExistsConfig
	| DataTableV11RowRowNotExistsConfig
	| DataTableV11RowInsertConfig
	| DataTableV11RowUpdateConfig
	| DataTableV11RowUpsertConfig
	| DataTableV11TableCreateConfig
	| DataTableV11TableDeleteConfig
	| DataTableV11TableListConfig
	| DataTableV11TableUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type DataTableV11Node = {
	type: 'n8n-nodes-base.dataTable';
	version: 1 | 1.1;
	config: NodeConfig<DataTableV11Params>;
	credentials?: Record<string, never>;
};

export type DataTableNode = DataTableV11Node;
