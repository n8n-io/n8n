/**
 * WooCommerce Node Types
 *
 * Consume WooCommerce API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/woocommerce/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a customer */
export type WooCommerceV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a customer */
export type WooCommerceV1CustomerDeleteConfig = {
	resource: 'customer';
	operation: 'delete';
	/**
	 * ID of the customer to delete
	 */
	customerId: string | Expression<string>;
};

/** Retrieve a customer */
export type WooCommerceV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
	/**
	 * ID of the customer to retrieve
	 */
	customerId: string | Expression<string>;
};

/** Retrieve many customers */
export type WooCommerceV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a customer */
export type WooCommerceV1CustomerUpdateConfig = {
	resource: 'customer';
	operation: 'update';
	/**
	 * ID of the customer to update
	 */
	customerId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a customer */
export type WooCommerceV1OrderCreateConfig = {
	resource: 'order';
	operation: 'create';
	additionalFields?: Record<string, unknown>;
	/**
	 * Billing address
	 * @default {}
	 */
	billingUi?: Record<string, unknown>;
	/**
	 * Coupons line data
	 * @default {}
	 */
	couponLinesUi?: Record<string, unknown>;
	/**
	 * Fee line data
	 * @default {}
	 */
	feeLinesUi?: Record<string, unknown>;
	/**
	 * Line item data
	 * @default {}
	 */
	lineItemsUi?: Record<string, unknown>;
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: Record<string, unknown>;
	/**
	 * Shipping address
	 * @default {}
	 */
	shippingUi?: Record<string, unknown>;
	/**
	 * Shipping line data
	 * @default {}
	 */
	shippingLinesUi?: Record<string, unknown>;
};

/** Delete a customer */
export type WooCommerceV1OrderDeleteConfig = {
	resource: 'order';
	operation: 'delete';
	orderId?: string | Expression<string>;
};

/** Retrieve a customer */
export type WooCommerceV1OrderGetConfig = {
	resource: 'order';
	operation: 'get';
	orderId?: string | Expression<string>;
};

/** Retrieve many customers */
export type WooCommerceV1OrderGetAllConfig = {
	resource: 'order';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a customer */
export type WooCommerceV1OrderUpdateConfig = {
	resource: 'order';
	operation: 'update';
	orderId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	/**
	 * Billing address
	 * @default {}
	 */
	billingUi?: Record<string, unknown>;
	/**
	 * Coupons line data
	 * @default {}
	 */
	couponLinesUi?: Record<string, unknown>;
	/**
	 * Fee line data
	 * @default {}
	 */
	feeLinesUi?: Record<string, unknown>;
	/**
	 * Line item data
	 * @default {}
	 */
	lineItemsUi?: Record<string, unknown>;
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: Record<string, unknown>;
	/**
	 * Shipping address
	 * @default {}
	 */
	shippingUi?: Record<string, unknown>;
	/**
	 * Shipping line data
	 * @default {}
	 */
	shippingLinesUi?: Record<string, unknown>;
};

/** Create a customer */
export type WooCommerceV1ProductCreateConfig = {
	resource: 'product';
	operation: 'create';
	/**
	 * Product name
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Product dimensions
	 * @default {}
	 */
	dimensionsUi?: Record<string, unknown>;
	/**
	 * Product Image
	 * @default {}
	 */
	imagesUi?: Record<string, unknown>;
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: Record<string, unknown>;
};

/** Delete a customer */
export type WooCommerceV1ProductDeleteConfig = {
	resource: 'product';
	operation: 'delete';
	productId?: string | Expression<string>;
};

/** Retrieve a customer */
export type WooCommerceV1ProductGetConfig = {
	resource: 'product';
	operation: 'get';
	productId?: string | Expression<string>;
};

/** Retrieve many customers */
export type WooCommerceV1ProductGetAllConfig = {
	resource: 'product';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a customer */
export type WooCommerceV1ProductUpdateConfig = {
	resource: 'product';
	operation: 'update';
	productId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	/**
	 * Product dimensions
	 * @default {}
	 */
	dimensionsUi?: Record<string, unknown>;
	/**
	 * Product Image
	 * @default {}
	 */
	imagesUi?: Record<string, unknown>;
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: Record<string, unknown>;
};

export type WooCommerceV1Params =
	| WooCommerceV1CustomerCreateConfig
	| WooCommerceV1CustomerDeleteConfig
	| WooCommerceV1CustomerGetConfig
	| WooCommerceV1CustomerGetAllConfig
	| WooCommerceV1CustomerUpdateConfig
	| WooCommerceV1OrderCreateConfig
	| WooCommerceV1OrderDeleteConfig
	| WooCommerceV1OrderGetConfig
	| WooCommerceV1OrderGetAllConfig
	| WooCommerceV1OrderUpdateConfig
	| WooCommerceV1ProductCreateConfig
	| WooCommerceV1ProductDeleteConfig
	| WooCommerceV1ProductGetConfig
	| WooCommerceV1ProductGetAllConfig
	| WooCommerceV1ProductUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WooCommerceV1Credentials {
	wooCommerceApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type WooCommerceV1Node = {
	type: 'n8n-nodes-base.wooCommerce';
	version: 1;
	config: NodeConfig<WooCommerceV1Params>;
	credentials?: WooCommerceV1Credentials;
};

export type WooCommerceNode = WooCommerceV1Node;
