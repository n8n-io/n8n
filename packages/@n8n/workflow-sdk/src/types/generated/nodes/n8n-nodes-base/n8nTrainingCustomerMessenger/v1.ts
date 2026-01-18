/**
 * Customer Messenger (n8n training) Node - Version 1
 * Dummy node used for n8n training
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface N8nTrainingCustomerMessengerV1Params {
	customerId: string | Expression<string>;
	message: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type N8nTrainingCustomerMessengerV1Node = {
	type: 'n8n-nodes-base.n8nTrainingCustomerMessenger';
	version: 1;
	config: NodeConfig<N8nTrainingCustomerMessengerV1Params>;
	credentials?: Record<string, never>;
};