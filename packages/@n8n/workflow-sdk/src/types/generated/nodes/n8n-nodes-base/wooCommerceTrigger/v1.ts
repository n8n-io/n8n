/**
 * WooCommerce Trigger Node - Version 1
 * Handle WooCommerce events via webhooks
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
// Node Types
// ===========================================================================

interface WooCommerceTriggerV1NodeBase {
	type: 'n8n-nodes-base.wooCommerceTrigger';
	version: 1;
	credentials?: WooCommerceTriggerV1Credentials;
	isTrigger: true;
}

export type WooCommerceTriggerV1ParamsNode = WooCommerceTriggerV1NodeBase & {
	config: NodeConfig<WooCommerceTriggerV1Params>;
};

export type WooCommerceTriggerV1Node = WooCommerceTriggerV1ParamsNode;