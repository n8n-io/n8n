/**
 * Stripe Trigger Node - Version 1
 * Handle Stripe events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StripeTriggerV1Config {
/**
 * The event to listen to
 * @default []
 */
		events: Array<'*' | 'account.updated' | 'account.application.authorized' | 'account.application.deauthorized' | 'account.external_account.created' | 'account.external_account.deleted' | 'account.external_account.updated' | 'application_fee.created' | 'application_fee.refunded' | 'application_fee.refund.updated' | 'balance.available' | 'capability.updated' | 'charge.captured' | 'charge.expired' | 'charge.failed' | 'charge.pending' | 'charge.refunded' | 'charge.succeeded' | 'charge.updated' | 'charge.dispute.closed' | 'charge.dispute.created' | 'charge.dispute.funds_reinstated' | 'charge.dispute.funds_withdrawn' | 'charge.dispute.updated' | 'charge.refund.updated' | 'checkout.session.completed' | 'coupon.created' | 'coupon.deleted' | 'coupon.updated' | 'credit_note.created' | 'credit_note.updated' | 'credit_note.voided' | 'customer.created' | 'customer.deleted' | 'customer.updated' | 'customer.discount.created' | 'customer.discount.deleted' | 'customer.discount.updated' | 'customer.source.created' | 'customer.source.deleted' | 'customer.source.expiring' | 'customer.source.updated' | 'customer.subscription.created' | 'customer.subscription.deleted' | 'customer.subscription.trial_will_end' | 'customer.subscription.updated' | 'customer.tax_id.created' | 'customer.tax_id.deleted' | 'customer.tax_id.updated' | 'file.created' | 'invoice.created' | 'invoice.deleted' | 'invoice.finalized' | 'invoice.marked_uncollectible' | 'invoice.payment_action_required' | 'invoice.payment_failed' | 'invoice.payment_succeeded' | 'invoice.sent' | 'invoice.upcoming' | 'invoice.updated' | 'invoice.voided' | 'invoiceitem.created' | 'invoiceitem.deleted' | 'invoiceitem.updated' | 'issuing_authorization.created' | 'issuing_authorization.request' | 'issuing_authorization.updated' | 'issuing_card.created' | 'issuing_card.updated' | 'issuing_cardholder.created' | 'issuing_cardholder.updated' | 'issuing_dispute.created' | 'issuing_dispute.updated' | 'issuing_settlement.created' | 'issuing_settlement.updated' | 'issuing_transaction.created' | 'issuing_transaction.updated' | 'order.created' | 'order.payment_failed' | 'order.payment_succeeded' | 'order.updated' | 'order_return.created' | 'payment_intent.amount_capturable_updated' | 'payment_intent.canceled' | 'payment_intent.created' | 'payment_intent.payment_failed' | 'payment_intent.succeeded' | 'payment_intent.requires_action' | 'payment_method.attached' | 'payment_method.card_automatically_updated' | 'payment_method.detached' | 'payment_method.updated' | 'payout.canceled' | 'payout.created' | 'payout.failed' | 'payout.paid' | 'payout.updated' | 'person.created' | 'person.deleted' | 'person.updated' | 'plan.created' | 'plan.deleted' | 'plan.updated' | 'product.created' | 'product.deleted' | 'product.updated' | 'radar.early_fraud_warning.created' | 'radar.early_fraud_warning.updated' | 'recipient.created' | 'recipient.deleted' | 'recipient.updated' | 'reporting.report_run.failed' | 'reporting.report_run.succeeded' | 'reporting.report_type.updated' | 'review.closed' | 'review.opened' | 'setup_intent.canceled' | 'setup_intent.created' | 'setup_intent.setup_failed' | 'setup_intent.succeeded' | 'sigma.scheduled_query_run.created' | 'sku.created' | 'sku.deleted' | 'sku.updated' | 'source.canceled' | 'source.chargeable' | 'source.failed' | 'source.mandate_notification' | 'source.refund_attributes_required' | 'source.transaction.created' | 'source.transaction.updated' | 'subscription_schedule.aborted' | 'subscription_schedule.canceled' | 'subscription_schedule.completed' | 'subscription_schedule.created' | 'subscription_schedule.expiring' | 'subscription_schedule.released' | 'subscription_schedule.updated' | 'tax_rate.created' | 'tax_rate.updated' | 'topup.canceled' | 'topup.created' | 'topup.failed' | 'topup.reversed' | 'topup.succeeded' | 'transfer.created' | 'transfer.failed' | 'transfer.paid' | 'transfer.reversed' | 'transfer.updated'>;
/**
 * The API version to use for requests. It controls the format and structure of the incoming event payloads that Stripe sends to your webhook. If empty, Stripe will use the default API version set in your account at the time, which may lead to event processing issues if the API version changes in the future.
 */
		apiVersion?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface StripeTriggerV1Credentials {
	stripeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface StripeTriggerV1NodeBase {
	type: 'n8n-nodes-base.stripeTrigger';
	version: 1;
	credentials?: StripeTriggerV1Credentials;
	isTrigger: true;
}

export type StripeTriggerV1Node = StripeTriggerV1NodeBase & {
	config: NodeConfig<StripeTriggerV1Config>;
};

export type StripeTriggerV1Node = StripeTriggerV1Node;