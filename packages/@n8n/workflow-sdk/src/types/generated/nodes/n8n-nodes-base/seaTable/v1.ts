/**
 * SeaTable Node - Version 1
 * Consume the SeaTable API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SeaTableV1Config {
	resource?: 'row' | Expression<string>;
/**
 * The operation being performed
 * @default create
 */
		operation?: 'create' | 'delete' | 'get' | 'getAll' | 'update' | Expression<string>;
/**
 * The name of SeaTable table to access. Choose from the list, or specify the name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.hide { operation: ["get"] }
 */
		tableName: string | Expression<string>;
/**
 * The name of SeaTable table to access. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["get"] }
 */
		tableId: string | Expression<string>;
	rowId?: string | Expression<string>;
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { operation: ["create", "update"] }
 * @default defineBelow
 */
		fieldsToSend?: 'autoMapInputData' | 'defineBelow' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { operation: ["create", "update"], fieldsToSend: ["autoMapInputData"] }
 */
		inputsToIgnore?: string | Expression<string>;
/**
 * Add destination column with its value
 * @displayOptions.show { operation: ["create", "update"], fieldsToSend: ["defineBelow"] }
 * @default {}
 */
		columnsUi?: {
		columnValues?: Array<{
			/** Choose from the list, or specify the name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;
			 */
			columnName?: string | Expression<string>;
			/** Column Value
			 */
			columnValue?: string | Expression<string>;
		}>;
	};
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SeaTableV1Credentials {
	seaTableApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SeaTableV1NodeBase {
	type: 'n8n-nodes-base.seaTable';
	version: 1;
	credentials?: SeaTableV1Credentials;
}

export type SeaTableV1Node = SeaTableV1NodeBase & {
	config: NodeConfig<SeaTableV1Config>;
};

export type SeaTableV1Node = SeaTableV1Node;