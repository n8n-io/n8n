/**
 * NocoDB Node - Version 1
 * Read, update, write and delete data from NocoDB
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a row */
export type NocoDbV1RowCreateConfig = {
	resource: 'row';
	operation: 'create';
	version?: 1 | 2 | 3 | Expression<number>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 * @default none
 */
		workspaceId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 */
		projectId: string | Expression<string>;
/**
 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { version: [2, 3] }
 */
		table: string | Expression<string>;
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
			/** Field Name
			 */
			fieldName?: string | Expression<string>;
			/** Whether the field data to set is binary and should be taken from a binary property
			 * @default false
			 */
			binaryData?: boolean | Expression<boolean>;
			/** Field Value
			 * @displayOptions.show { binaryData: [false] }
			 */
			fieldValue?: string | Expression<string>;
			/** The field containing the binary file data to be uploaded
			 * @displayOptions.show { binaryData: [true] }
			 */
			binaryProperty?: string | Expression<string>;
		}>;
	};
};

/** Delete a row */
export type NocoDbV1RowDeleteConfig = {
	resource: 'row';
	operation: 'delete';
	version?: 1 | 2 | 3 | Expression<number>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 * @default none
 */
		workspaceId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 */
		projectId: string | Expression<string>;
/**
 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { version: [2, 3] }
 */
		table: string | Expression<string>;
	primaryKey?: 'id' | 'ncRecordId' | 'custom' | Expression<string>;
	customPrimaryKey?: string | Expression<string>;
/**
 * The value of the ID field
 * @displayOptions.show { version: [1, 2], operation: ["delete", "get", "update"] }
 */
		id: string | Expression<string>;
};

/** Retrieve a row */
export type NocoDbV1RowGetConfig = {
	resource: 'row';
	operation: 'get';
	version?: 1 | 2 | 3 | Expression<number>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 * @default none
 */
		workspaceId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 */
		projectId: string | Expression<string>;
/**
 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { version: [2, 3] }
 */
		table: string | Expression<string>;
/**
 * The value of the ID field
 * @displayOptions.show { version: [1, 2], operation: ["delete", "get", "update"] }
 */
		id: string | Expression<string>;
/**
 * Whether the attachment fields define in 'Download Fields' will be downloaded
 * @displayOptions.show { operation: ["get"] }
 * @default false
 */
		downloadAttachments?: boolean | Expression<boolean>;
/**
 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.
 * @displayOptions.show { operation: ["get"], downloadAttachments: [true] }
 */
		downloadFieldNames: string | Expression<string>;
};

/** Retrieve many rows */
export type NocoDbV1RowGetAllConfig = {
	resource: 'row';
	operation: 'getAll';
	version?: 1 | 2 | 3 | Expression<number>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 * @default none
 */
		workspaceId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 */
		projectId: string | Expression<string>;
/**
 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { version: [2, 3] }
 */
		table: string | Expression<string>;
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
/**
 * Whether the attachment fields define in 'Download Fields' will be downloaded
 * @displayOptions.show { operation: ["getAll"] }
 * @default false
 */
		downloadAttachments?: boolean | Expression<boolean>;
/**
 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.
 * @displayOptions.show { operation: ["getAll"], downloadAttachments: [true] }
 */
		downloadFieldNames: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update a row */
export type NocoDbV1RowUpdateConfig = {
	resource: 'row';
	operation: 'update';
	version?: 1 | 2 | 3 | Expression<number>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 * @default none
 */
		workspaceId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { version: [3] }
 */
		projectId: string | Expression<string>;
/**
 * The table to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { version: [2, 3] }
 */
		table: string | Expression<string>;
	primaryKey?: 'id' | 'ncRecordId' | 'custom' | Expression<string>;
	customPrimaryKey?: string | Expression<string>;
/**
 * The value of the ID field
 * @displayOptions.show { version: [1, 2], operation: ["delete", "get", "update"] }
 */
		id: string | Expression<string>;
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
			/** Field Name
			 */
			fieldName?: string | Expression<string>;
			/** Whether the field data to set is binary and should be taken from a binary property
			 * @default false
			 */
			binaryData?: boolean | Expression<boolean>;
			/** Field Value
			 * @displayOptions.show { binaryData: [false] }
			 */
			fieldValue?: string | Expression<string>;
			/** The field containing the binary file data to be uploaded
			 * @displayOptions.show { binaryData: [true] }
			 */
			binaryProperty?: string | Expression<string>;
		}>;
	};
};

export type NocoDbV1Params =
	| NocoDbV1RowCreateConfig
	| NocoDbV1RowDeleteConfig
	| NocoDbV1RowGetConfig
	| NocoDbV1RowGetAllConfig
	| NocoDbV1RowUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NocoDbV1Credentials {
	nocoDb: CredentialReference;
	nocoDbApiToken: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface NocoDbV1NodeBase {
	type: 'n8n-nodes-base.nocoDb';
	version: 1;
	credentials?: NocoDbV1Credentials;
}

export type NocoDbV1RowCreateNode = NocoDbV1NodeBase & {
	config: NodeConfig<NocoDbV1RowCreateConfig>;
};

export type NocoDbV1RowDeleteNode = NocoDbV1NodeBase & {
	config: NodeConfig<NocoDbV1RowDeleteConfig>;
};

export type NocoDbV1RowGetNode = NocoDbV1NodeBase & {
	config: NodeConfig<NocoDbV1RowGetConfig>;
};

export type NocoDbV1RowGetAllNode = NocoDbV1NodeBase & {
	config: NodeConfig<NocoDbV1RowGetAllConfig>;
};

export type NocoDbV1RowUpdateNode = NocoDbV1NodeBase & {
	config: NodeConfig<NocoDbV1RowUpdateConfig>;
};

export type NocoDbV1Node =
	| NocoDbV1RowCreateNode
	| NocoDbV1RowDeleteNode
	| NocoDbV1RowGetNode
	| NocoDbV1RowGetAllNode
	| NocoDbV1RowUpdateNode
	;