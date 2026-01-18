/**
 * Coda Node Types
 *
 * Consume Coda API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/coda/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Controls provide a user-friendly way to input a value that can affect other parts of the doc */
export type CodaV11ControlGetConfig = {
	resource: 'control';
	operation: 'get';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The control to get the row from
	 */
	controlId: string | Expression<string>;
};

/** Controls provide a user-friendly way to input a value that can affect other parts of the doc */
export type CodaV11ControlGetAllConfig = {
	resource: 'control';
	operation: 'getAll';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
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
};

/** Formulas can be great for performing one-off computations */
export type CodaV11FormulaGetConfig = {
	resource: 'formula';
	operation: 'get';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The formula to get the row from
	 */
	formulaId: string | Expression<string>;
};

/** Formulas can be great for performing one-off computations */
export type CodaV11FormulaGetAllConfig = {
	resource: 'formula';
	operation: 'getAll';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
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
};

/** Access data of tables in documents */
export type CodaV11TableCreateRowConfig = {
	resource: 'table';
	operation: 'createRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to create the row in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Access data of tables in documents */
export type CodaV11TableDeleteRowConfig = {
	resource: 'table';
	operation: 'deleteRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to delete the row in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableId: string | Expression<string>;
	/**
	 * Row IDs to delete
	 */
	rowId: string | Expression<string>;
};

/** Access data of tables in documents */
export type CodaV11TableGetAllColumnsConfig = {
	resource: 'table';
	operation: 'getAllColumns';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
};

/** Access data of tables in documents */
export type CodaV11TableGetAllRowsConfig = {
	resource: 'table';
	operation: 'getAllRows';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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

/** Access data of tables in documents */
export type CodaV11TableGetColumnConfig = {
	resource: 'table';
	operation: 'getColumn';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableId: string | Expression<string>;
	/**
	 * The table to get the row from
	 */
	columnId: string | Expression<string>;
};

/** Access data of tables in documents */
export type CodaV11TableGetRowConfig = {
	resource: 'table';
	operation: 'getRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableId: string | Expression<string>;
	/**
	 * ID or name of the row. Names are discouraged because they're easily prone to being changed by users. If you're using a name, be sure to URI-encode it. If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected
	 */
	rowId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Access data of tables in documents */
export type CodaV11TablePushButtonConfig = {
	resource: 'table';
	operation: 'pushButton';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableId: string | Expression<string>;
	/**
	 * ID or name of the row. Names are discouraged because they're easily prone to being changed by users. If you're using a name, be sure to URI-encode it. If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected
	 */
	rowId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	columnId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewDeleteViewRowConfig = {
	resource: 'view';
	operation: 'deleteViewRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	rowId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewGetConfig = {
	resource: 'view';
	operation: 'get';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from
	 */
	viewId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewGetAllViewColumnsConfig = {
	resource: 'view';
	operation: 'getAllViewColumns';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewId: string | Expression<string>;
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
};

/** Access data of views in documents */
export type CodaV11ViewGetAllConfig = {
	resource: 'view';
	operation: 'getAll';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
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
};

/** Access data of views in documents */
export type CodaV11ViewGetAllViewRowsConfig = {
	resource: 'view';
	operation: 'getAllViewRows';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewId: string | Expression<string>;
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

/** Access data of views in documents */
export type CodaV11ViewPushViewButtonConfig = {
	resource: 'view';
	operation: 'pushViewButton';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	rowId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	columnId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewUpdateViewRowConfig = {
	resource: 'view';
	operation: 'updateViewRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	rowId: string | Expression<string>;
	/**
	 * The view to get the row from
	 * @default columns
	 */
	keyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type CodaV11Params =
	| CodaV11ControlGetConfig
	| CodaV11ControlGetAllConfig
	| CodaV11FormulaGetConfig
	| CodaV11FormulaGetAllConfig
	| CodaV11TableCreateRowConfig
	| CodaV11TableDeleteRowConfig
	| CodaV11TableGetAllColumnsConfig
	| CodaV11TableGetAllRowsConfig
	| CodaV11TableGetColumnConfig
	| CodaV11TableGetRowConfig
	| CodaV11TablePushButtonConfig
	| CodaV11ViewDeleteViewRowConfig
	| CodaV11ViewGetConfig
	| CodaV11ViewGetAllViewColumnsConfig
	| CodaV11ViewGetAllConfig
	| CodaV11ViewGetAllViewRowsConfig
	| CodaV11ViewPushViewButtonConfig
	| CodaV11ViewUpdateViewRowConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CodaV11Credentials {
	codaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type CodaV11Node = {
	type: 'n8n-nodes-base.coda';
	version: 1 | 1.1;
	config: NodeConfig<CodaV11Params>;
	credentials?: CodaV11Credentials;
};

export type CodaNode = CodaV11Node;
