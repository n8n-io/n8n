/**
 * Shopify Node Types
 *
 * Consume Shopify API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/shopify/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an order */
export type ShopifyV1OrderCreateConfig = {
	resource: 'order';
	operation: 'create';
	additionalFields?: Record<string, unknown>;
	limeItemsUi?: Record<string, unknown>;
};

/** Delete an order */
export type ShopifyV1OrderDeleteConfig = {
	resource: 'order';
	operation: 'delete';
	orderId: string | Expression<string>;
};

/** Get an order */
export type ShopifyV1OrderGetConfig = {
	resource: 'order';
	operation: 'get';
	orderId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many orders */
export type ShopifyV1OrderGetAllConfig = {
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

/** Update an order */
export type ShopifyV1OrderUpdateConfig = {
	resource: 'order';
	operation: 'update';
	orderId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an order */
export type ShopifyV1ProductCreateConfig = {
	resource: 'product';
	operation: 'create';
	/**
	 * The name of the product
	 */
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an order */
export type ShopifyV1ProductDeleteConfig = {
	resource: 'product';
	operation: 'delete';
	productId: string | Expression<string>;
};

/** Get an order */
export type ShopifyV1ProductGetConfig = {
	resource: 'product';
	operation: 'get';
	productId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many orders */
export type ShopifyV1ProductGetAllConfig = {
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
	additionalFields?: Record<string, unknown>;
};

/** Update an order */
export type ShopifyV1ProductUpdateConfig = {
	resource: 'product';
	operation: 'update';
	productId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ShopifyV1Params =
	| ShopifyV1OrderCreateConfig
	| ShopifyV1OrderDeleteConfig
	| ShopifyV1OrderGetConfig
	| ShopifyV1OrderGetAllConfig
	| ShopifyV1OrderUpdateConfig
	| ShopifyV1ProductCreateConfig
	| ShopifyV1ProductDeleteConfig
	| ShopifyV1ProductGetConfig
	| ShopifyV1ProductGetAllConfig
	| ShopifyV1ProductUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ShopifyV1Credentials {
	shopifyApi: CredentialReference;
	shopifyAccessTokenApi: CredentialReference;
	shopifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ShopifyNode = {
	type: 'n8n-nodes-base.shopify';
	version: 1;
	config: NodeConfig<ShopifyV1Params>;
	credentials?: ShopifyV1Credentials;
};
