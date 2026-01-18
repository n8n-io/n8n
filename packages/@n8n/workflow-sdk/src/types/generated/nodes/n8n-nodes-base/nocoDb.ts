/**
 * NocoDB Node Types
 *
 * Read, update, write and delete data from NocoDB
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/nocodb/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a row */
export type NocoDbV3RowCreateConfig = {
	resource: 'row';
	operation: 'create';
	version?: 1 | 2 | 3 | Expression<number>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default none
	 */
	workspaceId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	projectId: string | Expression<string>;
	/**
	 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	table: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
};

/** Delete a row */
export type NocoDbV3RowDeleteConfig = {
	resource: 'row';
	operation: 'delete';
	version?: 1 | 2 | 3 | Expression<number>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default none
	 */
	workspaceId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	projectId: string | Expression<string>;
	/**
	 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	table: string | Expression<string>;
	primaryKey?: 'id' | 'ncRecordId' | 'custom' | Expression<string>;
	customPrimaryKey?: string | Expression<string>;
	/**
	 * The value of the ID field
	 */
	id: string | Expression<string>;
};

/** Retrieve a row */
export type NocoDbV3RowGetConfig = {
	resource: 'row';
	operation: 'get';
	version?: 1 | 2 | 3 | Expression<number>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default none
	 */
	workspaceId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	projectId: string | Expression<string>;
	/**
	 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	table: string | Expression<string>;
	/**
	 * The value of the ID field
	 */
	id: string | Expression<string>;
	/**
	 * Whether the attachment fields define in 'Download Fields' will be downloaded
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.
	 */
	downloadFieldNames: string | Expression<string>;
};

/** Retrieve many rows */
export type NocoDbV3RowGetAllConfig = {
	resource: 'row';
	operation: 'getAll';
	version?: 1 | 2 | 3 | Expression<number>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default none
	 */
	workspaceId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	projectId: string | Expression<string>;
	/**
	 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	table: string | Expression<string>;
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
	/**
	 * Whether the attachment fields define in 'Download Fields' will be downloaded
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.
	 */
	downloadFieldNames: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update a row */
export type NocoDbV3RowUpdateConfig = {
	resource: 'row';
	operation: 'update';
	version?: 1 | 2 | 3 | Expression<number>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default none
	 */
	workspaceId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	projectId: string | Expression<string>;
	/**
	 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	table: string | Expression<string>;
	primaryKey?: 'id' | 'ncRecordId' | 'custom' | Expression<string>;
	customPrimaryKey?: string | Expression<string>;
	/**
	 * The value of the ID field
	 */
	id: string | Expression<string>;
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineBelow
	 */
	dataToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsUi?: Record<string, unknown>;
};

export type NocoDbV3Params =
	| NocoDbV3RowCreateConfig
	| NocoDbV3RowDeleteConfig
	| NocoDbV3RowGetConfig
	| NocoDbV3RowGetAllConfig
	| NocoDbV3RowUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NocoDbV3Credentials {
	nocoDb: CredentialReference;
	nocoDbApiToken: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type NocoDbV3Node = {
	type: 'n8n-nodes-base.nocoDb';
	version: 1 | 2 | 3;
	config: NodeConfig<NocoDbV3Params>;
	credentials?: NocoDbV3Credentials;
};

export type NocoDbNode = NocoDbV3Node;
