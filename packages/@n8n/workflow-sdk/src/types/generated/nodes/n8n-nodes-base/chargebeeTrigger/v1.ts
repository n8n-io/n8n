/**
 * Chargebee Trigger Node - Version 1
 * Starts the workflow when Chargebee events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ChargebeeTriggerV1Config {
	events: Array<'*' | 'card_added' | 'card_deleted' | 'card_expired' | 'card_expiring' | 'card_updated' | 'customer_changed' | 'customer_created' | 'customer_deleted' | 'invoice_created' | 'invoice_deleted' | 'invoice_generated' | 'invoice_updated' | 'payment_failed' | 'payment_initiated' | 'payment_refunded' | 'payment_succeeded' | 'refund_initiated' | 'subscription_activated' | 'subscription_cancellation_scheduled' | 'subscription_cancelled' | 'subscription_cancelling' | 'subscription_changed' | 'subscription_created' | 'subscription_deleted' | 'subscription_reactivated' | 'subscription_renewal_reminder' | 'subscription_renewed' | 'subscription_scheduled_cancellation_removed' | 'subscription_shipping_address_updated' | 'subscription_started' | 'subscription_trial_ending' | 'transaction_created' | 'transaction_deleted' | 'transaction_updated'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ChargebeeTriggerV1NodeBase {
	type: 'n8n-nodes-base.chargebeeTrigger';
	version: 1;
	isTrigger: true;
}

export type ChargebeeTriggerV1Node = ChargebeeTriggerV1NodeBase & {
	config: NodeConfig<ChargebeeTriggerV1Config>;
};

export type ChargebeeTriggerV1Node = ChargebeeTriggerV1Node;