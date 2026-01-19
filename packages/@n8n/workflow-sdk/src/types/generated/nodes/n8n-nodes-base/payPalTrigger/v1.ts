/**
 * PayPal Trigger Node - Version 1
 * Handle PayPal events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

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
// Node Types
// ===========================================================================

interface PayPalTriggerV1NodeBase {
	type: 'n8n-nodes-base.payPalTrigger';
	version: 1;
	credentials?: PayPalTriggerV1Credentials;
	isTrigger: true;
}

export type PayPalTriggerV1ParamsNode = PayPalTriggerV1NodeBase & {
	config: NodeConfig<PayPalTriggerV1Params>;
};

export type PayPalTriggerV1Node = PayPalTriggerV1ParamsNode;