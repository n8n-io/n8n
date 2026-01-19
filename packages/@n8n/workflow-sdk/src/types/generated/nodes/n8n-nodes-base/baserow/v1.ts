/**
 * Baserow Node - Version 1
 * Consume the Baserow API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a row */
export type BaserowV1RowCreateConfig = {
	resource: 'row';
	operation: 'create';
/**
 * Database to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		databaseId: string | Expression<string>;
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		tableId: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { operation: ["create", "update"] }
 * @default defineBelow
 */
		dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { operation: ["create", "update"], dataToSend: ["autoMapInputData"] }
 */
		inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};

/** Delete a row */
export type BaserowV1RowDeleteConfig = {
	resource: 'row';
	operation: 'delete';
/**
 * Database to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		databaseId: string | Expression<string>;
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		tableId: string | Expression<string>;
/**
 * ID of the row to delete
 * @displayOptions.show { operation: ["delete"] }
 */
		rowId: string | Expression<string>;
};

/** Retrieve a row */
export type BaserowV1RowGetConfig = {
	resource: 'row';
	operation: 'get';
/**
 * Database to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		databaseId: string | Expression<string>;
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		tableId: string | Expression<string>;
/**
 * ID of the row to return
 * @displayOptions.show { operation: ["get"] }
 */
		rowId: string | Expression<string>;
};

/** Retrieve many rows */
export type BaserowV1RowGetAllConfig = {
	resource: 'row';
	operation: 'getAll';
/**
 * Database to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		databaseId: string | Expression<string>;
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		tableId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	additionalOptions?: Record<string, unknown>;
};

/** Update a row */
export type BaserowV1RowUpdateConfig = {
	resource: 'row';
	operation: 'update';
/**
 * Database to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		databaseId: string | Expression<string>;
/**
 * Table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		tableId: string | Expression<string>;
/**
 * ID of the row to update
 * @displayOptions.show { operation: ["update"] }
 */
		rowId: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { operation: ["create", "update"] }
 * @default defineBelow
 */
		dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { operation: ["create", "update"], dataToSend: ["autoMapInputData"] }
 */
		inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface BaserowV1Credentials {
	baserowApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface BaserowV1NodeBase {
	type: 'n8n-nodes-base.baserow';
	version: 1;
	credentials?: BaserowV1Credentials;
}

export type BaserowV1RowCreateNode = BaserowV1NodeBase & {
	config: NodeConfig<BaserowV1RowCreateConfig>;
};

export type BaserowV1RowDeleteNode = BaserowV1NodeBase & {
	config: NodeConfig<BaserowV1RowDeleteConfig>;
};

export type BaserowV1RowGetNode = BaserowV1NodeBase & {
	config: NodeConfig<BaserowV1RowGetConfig>;
};

export type BaserowV1RowGetAllNode = BaserowV1NodeBase & {
	config: NodeConfig<BaserowV1RowGetAllConfig>;
};

export type BaserowV1RowUpdateNode = BaserowV1NodeBase & {
	config: NodeConfig<BaserowV1RowUpdateConfig>;
};

export type BaserowV1Node =
	| BaserowV1RowCreateNode
	| BaserowV1RowDeleteNode
	| BaserowV1RowGetNode
	| BaserowV1RowGetAllNode
	| BaserowV1RowUpdateNode
	;