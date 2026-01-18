/**
 * Chargebee Trigger Node Types
 *
 * Starts the workflow when Chargebee events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/chargebeetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ChargebeeTriggerV1Params {
	events: Array<
		| '*'
		| 'card_added'
		| 'card_deleted'
		| 'card_expired'
		| 'card_expiring'
		| 'card_updated'
		| 'customer_changed'
		| 'customer_created'
		| 'customer_deleted'
		| 'invoice_created'
		| 'invoice_deleted'
		| 'invoice_generated'
		| 'invoice_updated'
		| 'payment_failed'
		| 'payment_initiated'
		| 'payment_refunded'
		| 'payment_succeeded'
		| 'refund_initiated'
		| 'subscription_activated'
		| 'subscription_cancellation_scheduled'
		| 'subscription_cancelled'
		| 'subscription_cancelling'
		| 'subscription_changed'
		| 'subscription_created'
		| 'subscription_deleted'
		| 'subscription_reactivated'
		| 'subscription_renewal_reminder'
		| 'subscription_renewed'
		| 'subscription_scheduled_cancellation_removed'
		| 'subscription_shipping_address_updated'
		| 'subscription_started'
		| 'subscription_trial_ending'
		| 'transaction_created'
		| 'transaction_deleted'
		| 'transaction_updated'
	>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ChargebeeTriggerNode = {
	type: 'n8n-nodes-base.chargebeeTrigger';
	version: 1;
	config: NodeConfig<ChargebeeTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
