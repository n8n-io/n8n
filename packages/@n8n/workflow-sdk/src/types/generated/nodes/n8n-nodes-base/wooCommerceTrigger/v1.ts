/**
 * WooCommerce Trigger Node - Version 1
 * Handle WooCommerce events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WooCommerceTriggerV1Params {
/**
 * Determines which resource events the webhook is triggered for
 */
		event: 'coupon.created' | 'coupon.deleted' | 'coupon.updated' | 'customer.created' | 'customer.deleted' | 'customer.updated' | 'order.created' | 'order.deleted' | 'order.updated' | 'product.created' | 'product.deleted' | 'product.updated' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WooCommerceTriggerV1Credentials {
	wooCommerceApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WooCommerceTriggerV1Node = {
	type: 'n8n-nodes-base.wooCommerceTrigger';
	version: 1;
	config: NodeConfig<WooCommerceTriggerV1Params>;
	credentials?: WooCommerceTriggerV1Credentials;
	isTrigger: true;
};