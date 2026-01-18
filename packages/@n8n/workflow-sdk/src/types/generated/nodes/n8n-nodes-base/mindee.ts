/**
 * Mindee Node Types
 *
 * Consume Mindee API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mindee/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MindeeV3Params {
	/**
	 * Which Mindee API Version to use
	 * @default 1
	 */
	apiVersion?: 1 | 3 | 4 | Expression<number>;
	resource?: 'invoice' | 'receipt' | Expression<string>;
	operation?: 'predict' | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Whether to return the data exactly in the way it got received from the API
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MindeeV3Credentials {
	mindeeReceiptApi: CredentialReference;
	mindeeInvoiceApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MindeeV3Node = {
	type: 'n8n-nodes-base.mindee';
	version: 1 | 2 | 3;
	config: NodeConfig<MindeeV3Params>;
	credentials?: MindeeV3Credentials;
};

export type MindeeNode = MindeeV3Node;
