/**
 * Coda Node - Version 1.1
 * Consume Coda API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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


// ===========================================================================
// Output Types
// ===========================================================================

export type CodaV11TableGetAllColumnsOutput = {
	display?: boolean;
	format?: {
		isArray?: boolean;
		type?: string;
	};
	href?: string;
	id?: string;
	name?: string;
	type?: string;
};

export type CodaV11TableGetAllRowsOutput = {
	id?: string;
};

export type CodaV11TableGetRowOutput = {
	id?: string;
};

export type CodaV11TablePushButtonOutput = {
	columnId?: string;
	requestId?: string;
	rowId?: string;
};

export type CodaV11ViewGetOutput = {
	href?: string;
	items?: Array<{
		browserLink?: string;
		href?: string;
		id?: string;
		name?: string;
		parent?: {
			browserLink?: string;
			href?: string;
			id?: string;
			name?: string;
			type?: string;
		};
		tableType?: string;
		type?: string;
	}>;
};

export type CodaV11ViewGetAllOutput = {
	browserLink?: string;
	href?: string;
	id?: string;
	name?: string;
	parent?: {
		browserLink?: string;
		href?: string;
		id?: string;
		name?: string;
		type?: string;
	};
	tableType?: string;
	type?: string;
};

export type CodaV11ViewGetAllViewRowsOutput = {
	'Contract ID'?: string;
	'Contract Link'?: string;
	'Contract Notes'?: string;
	'Contract Signature Date'?: string;
	contractTextOutput?: string;
	'Created on'?: string;
	'Do not use name/logo?'?: boolean;
	extractText?: string;
	fileSize?: string;
	'Full Deletion Required?'?: boolean;
	id?: string;
	'IT Addendum?'?: boolean;
	lastUpdated?: string;
	'over4MB?'?: boolean;
	'Processing Organization'?: string;
	rowID?: number;
	'Status Date'?: string;
	Summarize?: string;
	Summary?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface CodaV11Credentials {
	codaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CodaV11NodeBase {
	type: 'n8n-nodes-base.coda';
	version: 1.1;
	credentials?: CodaV11Credentials;
}

export type CodaV11ControlGetNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ControlGetConfig>;
};

export type CodaV11ControlGetAllNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ControlGetAllConfig>;
};

export type CodaV11FormulaGetNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11FormulaGetConfig>;
};

export type CodaV11FormulaGetAllNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11FormulaGetAllConfig>;
};

export type CodaV11TableCreateRowNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TableCreateRowConfig>;
};

export type CodaV11TableDeleteRowNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TableDeleteRowConfig>;
};

export type CodaV11TableGetAllColumnsNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TableGetAllColumnsConfig>;
	output?: CodaV11TableGetAllColumnsOutput;
};

export type CodaV11TableGetAllRowsNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TableGetAllRowsConfig>;
	output?: CodaV11TableGetAllRowsOutput;
};

export type CodaV11TableGetColumnNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TableGetColumnConfig>;
};

export type CodaV11TableGetRowNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TableGetRowConfig>;
	output?: CodaV11TableGetRowOutput;
};

export type CodaV11TablePushButtonNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11TablePushButtonConfig>;
	output?: CodaV11TablePushButtonOutput;
};

export type CodaV11ViewDeleteViewRowNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewDeleteViewRowConfig>;
};

export type CodaV11ViewGetNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewGetConfig>;
	output?: CodaV11ViewGetOutput;
};

export type CodaV11ViewGetAllViewColumnsNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewGetAllViewColumnsConfig>;
};

export type CodaV11ViewGetAllNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewGetAllConfig>;
	output?: CodaV11ViewGetAllOutput;
};

export type CodaV11ViewGetAllViewRowsNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewGetAllViewRowsConfig>;
	output?: CodaV11ViewGetAllViewRowsOutput;
};

export type CodaV11ViewPushViewButtonNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewPushViewButtonConfig>;
};

export type CodaV11ViewUpdateViewRowNode = CodaV11NodeBase & {
	config: NodeConfig<CodaV11ViewUpdateViewRowConfig>;
};

export type CodaV11Node =
	| CodaV11ControlGetNode
	| CodaV11ControlGetAllNode
	| CodaV11FormulaGetNode
	| CodaV11FormulaGetAllNode
	| CodaV11TableCreateRowNode
	| CodaV11TableDeleteRowNode
	| CodaV11TableGetAllColumnsNode
	| CodaV11TableGetAllRowsNode
	| CodaV11TableGetColumnNode
	| CodaV11TableGetRowNode
	| CodaV11TablePushButtonNode
	| CodaV11ViewDeleteViewRowNode
	| CodaV11ViewGetNode
	| CodaV11ViewGetAllViewColumnsNode
	| CodaV11ViewGetAllNode
	| CodaV11ViewGetAllViewRowsNode
	| CodaV11ViewPushViewButtonNode
	| CodaV11ViewUpdateViewRowNode
	;