/**
 * Shopify Trigger Node Types
 *
 * Handle Shopify events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/shopifytrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ShopifyTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | 'apiKey' | Expression<string>;
	topic?:
		| 'app/uninstalled'
		| 'carts/create'
		| 'carts/update'
		| 'checkouts/create'
		| 'checkouts/delete'
		| 'checkouts/update'
		| 'collections/create'
		| 'collections/delete'
		| 'collection_listings/add'
		| 'collection_listings/remove'
		| 'collection_listings/update'
		| 'collections/update'
		| 'customers/create'
		| 'customers/delete'
		| 'customers/disable'
		| 'customers/enable'
		| 'customer_groups/create'
		| 'customer_groups/delete'
		| 'customer_groups/update'
		| 'customers/update'
		| 'draft_orders/create'
		| 'draft_orders/delete'
		| 'draft_orders/update'
		| 'fulfillments/create'
		| 'fulfillment_events/create'
		| 'fulfillment_events/delete'
		| 'fulfillments/update'
		| 'inventory_items/create'
		| 'inventory_items/delete'
		| 'inventory_items/update'
		| 'inventory_levels/connect'
		| 'inventory_levels/disconnect'
		| 'inventory_levels/update'
		| 'locales/create'
		| 'locales/update'
		| 'locations/create'
		| 'locations/delete'
		| 'locations/update'
		| 'orders/cancelled'
		| 'orders/create'
		| 'orders/fulfilled'
		| 'orders/paid'
		| 'orders/partially_fulfilled'
		| 'order_transactions/create'
		| 'orders/updated'
		| 'orders/delete'
		| 'products/create'
		| 'products/delete'
		| 'product_listings/add'
		| 'product_listings/remove'
		| 'product_listings/update'
		| 'products/update'
		| 'refunds/create'
		| 'shop/update'
		| 'tender_transactions/create'
		| 'themes/create'
		| 'themes/delete'
		| 'themes/publish'
		| 'themes/update'
		| Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ShopifyTriggerV1Credentials {
	shopifyApi: CredentialReference;
	shopifyAccessTokenApi: CredentialReference;
	shopifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ShopifyTriggerNode = {
	type: 'n8n-nodes-base.shopifyTrigger';
	version: 1;
	config: NodeConfig<ShopifyTriggerV1Params>;
	credentials?: ShopifyTriggerV1Credentials;
	isTrigger: true;
};
