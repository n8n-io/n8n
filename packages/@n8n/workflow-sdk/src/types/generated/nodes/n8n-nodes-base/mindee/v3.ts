/**
 * Mindee Node - Version 3
 * Consume Mindee API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MindeeV3Params {
/**
 * Which Mindee API Version to use
 * @default 4
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

interface MindeeV3NodeBase {
	type: 'n8n-nodes-base.mindee';
	version: 3;
	credentials?: MindeeV3Credentials;
}

export type MindeeV3ParamsNode = MindeeV3NodeBase & {
	config: NodeConfig<MindeeV3Params>;
};

export type MindeeV3Node = MindeeV3ParamsNode;