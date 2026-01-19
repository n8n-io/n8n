/**
 * Coda Node - Version 1
 * Consume Coda API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Controls provide a user-friendly way to input a value that can affect other parts of the doc */
export type CodaV1ControlGetConfig = {
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
export type CodaV1ControlGetAllConfig = {
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
export type CodaV1FormulaGetConfig = {
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
export type CodaV1FormulaGetAllConfig = {
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
export type CodaV1TableCreateRowConfig = {
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
export type CodaV1TableDeleteRowConfig = {
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
export type CodaV1TableGetAllColumnsConfig = {
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
export type CodaV1TableGetAllRowsConfig = {
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
export type CodaV1TableGetColumnConfig = {
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
export type CodaV1TableGetRowConfig = {
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
export type CodaV1TablePushButtonConfig = {
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
export type CodaV1ViewDeleteViewRowConfig = {
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
export type CodaV1ViewGetConfig = {
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
export type CodaV1ViewGetAllViewColumnsConfig = {
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
export type CodaV1ViewGetAllConfig = {
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
export type CodaV1ViewGetAllViewRowsConfig = {
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
export type CodaV1ViewPushViewButtonConfig = {
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
export type CodaV1ViewUpdateViewRowConfig = {
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

export type CodaV1TableGetAllColumnsOutput = {
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

export type CodaV1TableGetAllRowsOutput = {
	id?: string;
};

export type CodaV1TableGetRowOutput = {
	id?: string;
};

export type CodaV1TablePushButtonOutput = {
	columnId?: string;
	requestId?: string;
	rowId?: string;
};

export type CodaV1ViewGetOutput = {
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

export type CodaV1ViewGetAllOutput = {
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

export type CodaV1ViewGetAllViewRowsOutput = {
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

export interface CodaV1Credentials {
	codaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CodaV1NodeBase {
	type: 'n8n-nodes-base.coda';
	version: 1;
	credentials?: CodaV1Credentials;
}

export type CodaV1ControlGetNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ControlGetConfig>;
};

export type CodaV1ControlGetAllNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ControlGetAllConfig>;
};

export type CodaV1FormulaGetNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1FormulaGetConfig>;
};

export type CodaV1FormulaGetAllNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1FormulaGetAllConfig>;
};

export type CodaV1TableCreateRowNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TableCreateRowConfig>;
};

export type CodaV1TableDeleteRowNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TableDeleteRowConfig>;
};

export type CodaV1TableGetAllColumnsNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TableGetAllColumnsConfig>;
	output?: CodaV1TableGetAllColumnsOutput;
};

export type CodaV1TableGetAllRowsNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TableGetAllRowsConfig>;
	output?: CodaV1TableGetAllRowsOutput;
};

export type CodaV1TableGetColumnNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TableGetColumnConfig>;
};

export type CodaV1TableGetRowNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TableGetRowConfig>;
	output?: CodaV1TableGetRowOutput;
};

export type CodaV1TablePushButtonNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1TablePushButtonConfig>;
	output?: CodaV1TablePushButtonOutput;
};

export type CodaV1ViewDeleteViewRowNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewDeleteViewRowConfig>;
};

export type CodaV1ViewGetNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewGetConfig>;
	output?: CodaV1ViewGetOutput;
};

export type CodaV1ViewGetAllViewColumnsNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewGetAllViewColumnsConfig>;
};

export type CodaV1ViewGetAllNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewGetAllConfig>;
	output?: CodaV1ViewGetAllOutput;
};

export type CodaV1ViewGetAllViewRowsNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewGetAllViewRowsConfig>;
	output?: CodaV1ViewGetAllViewRowsOutput;
};

export type CodaV1ViewPushViewButtonNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewPushViewButtonConfig>;
};

export type CodaV1ViewUpdateViewRowNode = CodaV1NodeBase & {
	config: NodeConfig<CodaV1ViewUpdateViewRowConfig>;
};

export type CodaV1Node =
	| CodaV1ControlGetNode
	| CodaV1ControlGetAllNode
	| CodaV1FormulaGetNode
	| CodaV1FormulaGetAllNode
	| CodaV1TableCreateRowNode
	| CodaV1TableDeleteRowNode
	| CodaV1TableGetAllColumnsNode
	| CodaV1TableGetAllRowsNode
	| CodaV1TableGetColumnNode
	| CodaV1TableGetRowNode
	| CodaV1TablePushButtonNode
	| CodaV1ViewDeleteViewRowNode
	| CodaV1ViewGetNode
	| CodaV1ViewGetAllViewColumnsNode
	| CodaV1ViewGetAllNode
	| CodaV1ViewGetAllViewRowsNode
	| CodaV1ViewPushViewButtonNode
	| CodaV1ViewUpdateViewRowNode
	;