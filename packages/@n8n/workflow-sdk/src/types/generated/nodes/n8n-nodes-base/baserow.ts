/**
 * Baserow Node Types
 *
 * Consume the Baserow API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/baserow/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 * @default defineBelow
	 */
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			fieldId?: string | Expression<string>;
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	rowId: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: {
		fieldValues?: Array<{
			fieldId?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
		}>;
	};
};

export type BaserowV1Params =
	| BaserowV1RowCreateConfig
	| BaserowV1RowDeleteConfig
	| BaserowV1RowGetConfig
	| BaserowV1RowGetAllConfig
	| BaserowV1RowUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BaserowV1Credentials {
	baserowApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type BaserowV1Node = {
	type: 'n8n-nodes-base.baserow';
	version: 1;
	config: NodeConfig<BaserowV1Params>;
	credentials?: BaserowV1Credentials;
};

export type BaserowNode = BaserowV1Node;
