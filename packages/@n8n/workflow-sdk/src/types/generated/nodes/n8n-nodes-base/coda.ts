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
	 * @displayOptions.show { resource: ["control"], operation: ["get"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The control to get the row from
	 * @displayOptions.show { resource: ["control"], operation: ["get"] }
	 */
	controlId: string | Expression<string>;
};

/** Controls provide a user-friendly way to input a value that can affect other parts of the doc */
export type CodaV11ControlGetAllConfig = {
	resource: 'control';
	operation: 'getAll';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["control"], operation: ["getAll"] }
	 */
	docId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["control"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["control"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["formula"], operation: ["get"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The formula to get the row from
	 * @displayOptions.show { resource: ["formula"], operation: ["get"] }
	 */
	formulaId: string | Expression<string>;
};

/** Formulas can be great for performing one-off computations */
export type CodaV11FormulaGetAllConfig = {
	resource: 'formula';
	operation: 'getAll';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["formula"], operation: ["getAll"] }
	 */
	docId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["formula"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["formula"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["table"], operation: ["createRow"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to create the row in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["createRow"] }
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
	 * @displayOptions.show { resource: ["table"], operation: ["deleteRow"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to delete the row in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["deleteRow"] }
	 */
	tableId: string | Expression<string>;
	/**
	 * Row IDs to delete
	 * @displayOptions.show { resource: ["table"], operation: ["deleteRow"] }
	 */
	rowId: string | Expression<string>;
};

/** Access data of tables in documents */
export type CodaV11TableGetAllColumnsConfig = {
	resource: 'table';
	operation: 'getAllColumns';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["getAllColumns"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["getAllColumns"] }
	 */
	tableId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["table"], operation: ["getAllColumns"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["table"], operation: ["getAllColumns"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["table"], operation: ["getAllRows"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["getAllRows"] }
	 */
	tableId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["table"], operation: ["getAllRows"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["table"], operation: ["getAllRows"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["table"], operation: ["getColumn"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["getColumn"] }
	 */
	tableId: string | Expression<string>;
	/**
	 * The table to get the row from
	 * @displayOptions.show { resource: ["table"], operation: ["getColumn"] }
	 */
	columnId: string | Expression<string>;
};

/** Access data of tables in documents */
export type CodaV11TableGetRowConfig = {
	resource: 'table';
	operation: 'getRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["getRow"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["getRow"] }
	 */
	tableId: string | Expression<string>;
	/**
	 * ID or name of the row. Names are discouraged because they're easily prone to being changed by users. If you're using a name, be sure to URI-encode it. If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected
	 * @displayOptions.show { resource: ["table"], operation: ["getRow"] }
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
	 * @displayOptions.show { resource: ["table"], operation: ["pushButton"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["table"], operation: ["pushButton"] }
	 */
	tableId: string | Expression<string>;
	/**
	 * ID or name of the row. Names are discouraged because they're easily prone to being changed by users. If you're using a name, be sure to URI-encode it. If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected
	 * @displayOptions.show { resource: ["table"], operation: ["pushButton"] }
	 */
	rowId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["table"], operation: ["pushButton"] }
	 */
	columnId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewDeleteViewRowConfig = {
	resource: 'view';
	operation: 'deleteViewRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["deleteViewRow"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["deleteViewRow"] }
	 */
	viewId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["deleteViewRow"] }
	 */
	rowId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewGetConfig = {
	resource: 'view';
	operation: 'get';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["get"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from
	 * @displayOptions.show { resource: ["view"], operation: ["get"] }
	 */
	viewId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewGetAllViewColumnsConfig = {
	resource: 'view';
	operation: 'getAllViewColumns';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewColumns"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewColumns"] }
	 */
	viewId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewColumns"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewColumns"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["view"], operation: ["getAll"] }
	 */
	docId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["view"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["view"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewRows"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The table to get the rows from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewRows"] }
	 */
	viewId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewRows"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["view"], operation: ["getAllViewRows"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["view"], operation: ["pushViewButton"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["pushViewButton"] }
	 */
	viewId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["pushViewButton"] }
	 */
	rowId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["view"], operation: ["pushViewButton"] }
	 */
	columnId: string | Expression<string>;
};

/** Access data of views in documents */
export type CodaV11ViewUpdateViewRowConfig = {
	resource: 'view';
	operation: 'updateViewRow';
	/**
	 * ID of the doc. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["updateViewRow"] }
	 */
	docId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["updateViewRow"] }
	 */
	viewId: string | Expression<string>;
	/**
	 * The view to get the row from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["view"], operation: ["updateViewRow"] }
	 */
	rowId: string | Expression<string>;
	/**
	 * The view to get the row from
	 * @displayOptions.show { resource: ["view"], operation: ["updateViewRow"] }
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
