/**
 * Grist Node - Version 1
 * Consume the Grist API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GristV1Params {
	operation?: 'create' | 'delete' | 'getAll' | 'update' | Expression<string>;
/**
 * In your document, click your profile icon, then Document Settings, then copy the value under "This document's ID"
 */
		docId: string | Expression<string>;
/**
 * ID of table to operate on. If unsure, look at the Code View.
 */
		tableId: string | Expression<string>;
/**
 * ID of the row to delete, or comma-separated list of row IDs to delete
 * @displayOptions.show { operation: ["delete"] }
 */
		rowId: string | Expression<string>;
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
/**
 * Whether to insert the input data this node receives in the new row
 * @displayOptions.show { operation: ["create", "update"] }
 * @default defineInNode
 */
		dataToSend?: 'autoMapInputs' | 'defineInNode' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
 * @displayOptions.show { operation: ["create", "update"], dataToSend: ["autoMapInputs"] }
 */
		inputsToIgnore?: string | Expression<string>;
	fieldsToSend?: {
		properties?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldId?: string | Expression<string>;
			/** Field Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GristV1Credentials {
	gristApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GristV1NodeBase {
	type: 'n8n-nodes-base.grist';
	version: 1;
	credentials?: GristV1Credentials;
}

export type GristV1ParamsNode = GristV1NodeBase & {
	config: NodeConfig<GristV1Params>;
};

export type GristV1Node = GristV1ParamsNode;