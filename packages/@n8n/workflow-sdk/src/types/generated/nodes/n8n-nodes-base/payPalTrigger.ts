/**
 * PayPal Trigger Node Types
 *
 * Handle PayPal events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/paypaltrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PayPalTriggerV1Params {
	/**
	 * The event to listen to. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	events: string[];
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PayPalTriggerV1Credentials {
	payPalApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PayPalTriggerNode = {
	type: 'n8n-nodes-base.payPalTrigger';
	version: 1;
	config: NodeConfig<PayPalTriggerV1Params>;
	credentials?: PayPalTriggerV1Credentials;
	isTrigger: true;
};
