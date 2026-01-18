/**
 * Grist Node Types
 *
 * Consume the Grist API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/grist/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	rowId: string | Expression<string>;
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
	/**
	 * Whether to insert the input data this node receives in the new row
	 * @default defineInNode
	 */
	dataToSend?: 'autoMapInputs' | 'defineInNode' | Expression<string>;
	/**
	 * List of input properties to avoid sending, separated by commas. Leave empty to send all properties.
	 */
	inputsToIgnore?: string | Expression<string>;
	fieldsToSend?: {
		properties?: Array<{
			fieldId?: string | Expression<string>;
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

export type GristV1Node = {
	type: 'n8n-nodes-base.grist';
	version: 1;
	config: NodeConfig<GristV1Params>;
	credentials?: GristV1Credentials;
};

export type GristNode = GristV1Node;
