/**
 * Mindee Node - Version 1
 * Consume Mindee API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MindeeV1Params {
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

export interface MindeeV1Credentials {
	mindeeReceiptApi: CredentialReference;
	mindeeInvoiceApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MindeeV1Node = {
	type: 'n8n-nodes-base.mindee';
	version: 1;
	config: NodeConfig<MindeeV1Params>;
	credentials?: MindeeV1Credentials;
};