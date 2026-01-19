/**
 * Shopify Node - Version 1
 * Consume Shopify API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an order */
export type ShopifyV1OrderCreateConfig = {
	resource: 'order';
	operation: 'create';
	additionalFields?: Record<string, unknown>;
	limeItemsUi?: {
		lineItemValues?: Array<{
			/** The ID of the product that the line item belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			productId?: string | Expression<string>;
			/** The ID of the product variant
			 */
			variantId?: string | Expression<string>;
			/** The title of the product
			 */
			title?: string | Expression<string>;
			/** The weight of the item in grams
			 */
			grams?: string | Expression<string>;
			/** The number of items that were purchased
			 * @default 1
			 */
			quantity?: number | Expression<number>;
			/** Price
			 */
			price?: string | Expression<string>;
		}>;
	};
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
 * @displayOptions.show { resource: ["order"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["order"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["create"], resource: ["product"] }
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
 * @displayOptions.show { resource: ["product"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["product"], operation: ["getAll"], returnAll: [false] }
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


// ===========================================================================
// Output Types
// ===========================================================================

export type ShopifyV1OrderGetOutput = {
	id?: number;
};

export type ShopifyV1OrderGetAllOutput = {
	created_at?: string;
	id?: number;
	line_items?: Array<{
		admin_graphql_api_id?: string;
		current_quantity?: number;
		discount_allocations?: Array<{
			amount?: string;
			amount_set?: {
				presentment_money?: {
					amount?: string;
					currency_code?: string;
				};
				shop_money?: {
					amount?: string;
					currency_code?: string;
				};
			};
			discount_application_index?: number;
		}>;
		fulfillable_quantity?: number;
		fulfillment_service?: string;
		gift_card?: boolean;
		grams?: number;
		id?: number;
		name?: string;
		price?: string;
		price_set?: {
			presentment_money?: {
				amount?: string;
				currency_code?: string;
			};
			shop_money?: {
				amount?: string;
				currency_code?: string;
			};
		};
		product_exists?: boolean;
		properties?: Array<{
			name?: string;
		}>;
		quantity?: number;
		requires_shipping?: boolean;
		tax_lines?: Array<{
			channel_liable?: boolean;
			price?: string;
			price_set?: {
				presentment_money?: {
					amount?: string;
					currency_code?: string;
				};
				shop_money?: {
					amount?: string;
					currency_code?: string;
				};
			};
			title?: string;
		}>;
		taxable?: boolean;
		title?: string;
		total_discount?: string;
		total_discount_set?: {
			presentment_money?: {
				amount?: string;
				currency_code?: string;
			};
			shop_money?: {
				amount?: string;
				currency_code?: string;
			};
		};
		vendor?: string;
	}>;
};

export type ShopifyV1ProductCreateOutput = {
	admin_graphql_api_id?: string;
	created_at?: string;
	handle?: string;
	id?: number;
	images?: Array<{
		admin_graphql_api_id?: string;
		alt?: null;
		created_at?: string;
		height?: number;
		id?: number;
		position?: number;
		product_id?: number;
		src?: string;
		updated_at?: string;
		width?: number;
	}>;
	options?: Array<{
		id?: number;
		name?: string;
		position?: number;
		product_id?: number;
		values?: Array<string>;
	}>;
	product_type?: string;
	published_scope?: string;
	status?: string;
	tags?: string;
	title?: string;
	updated_at?: string;
	variants?: Array<{
		admin_graphql_api_id?: string;
		barcode?: null;
		compare_at_price?: null;
		created_at?: string;
		fulfillment_service?: string;
		grams?: number;
		id?: number;
		image_id?: null;
		inventory_item_id?: number;
		inventory_management?: null;
		inventory_policy?: string;
		inventory_quantity?: number;
		old_inventory_quantity?: number;
		option1?: string;
		option2?: null;
		option3?: null;
		position?: number;
		price?: string;
		product_id?: number;
		requires_shipping?: boolean;
		sku?: string;
		taxable?: boolean;
		title?: string;
		updated_at?: string;
		weight?: number;
		weight_unit?: string;
	}>;
	vendor?: string;
};

export type ShopifyV1ProductGetOutput = {
	admin_graphql_api_id?: string;
	created_at?: string;
	handle?: string;
	id?: number;
	image?: {
		admin_graphql_api_id?: string;
		created_at?: string;
		height?: number;
		id?: number;
		position?: number;
		product_id?: number;
		src?: string;
		updated_at?: string;
		variant_ids?: Array<number>;
		width?: number;
	};
	images?: Array<{
		admin_graphql_api_id?: string;
		created_at?: string;
		height?: number;
		id?: number;
		position?: number;
		product_id?: number;
		src?: string;
		updated_at?: string;
		variant_ids?: Array<number>;
		width?: number;
	}>;
	options?: Array<{
		id?: number;
		name?: string;
		position?: number;
		product_id?: number;
		values?: Array<string>;
	}>;
	product_type?: string;
	published_scope?: string;
	status?: string;
	tags?: string;
	title?: string;
	updated_at?: string;
	variants?: Array<{
		admin_graphql_api_id?: string;
		created_at?: string;
		fulfillment_service?: string;
		grams?: number;
		id?: number;
		inventory_item_id?: number;
		inventory_policy?: string;
		inventory_quantity?: number;
		old_inventory_quantity?: number;
		option1?: string;
		position?: number;
		price?: string;
		product_id?: number;
		requires_shipping?: boolean;
		taxable?: boolean;
		title?: string;
		updated_at?: string;
		weight_unit?: string;
	}>;
	vendor?: string;
};

export type ShopifyV1ProductGetAllOutput = {
	admin_graphql_api_id?: string;
	created_at?: string;
	handle?: string;
	id?: number;
	images?: Array<{
		admin_graphql_api_id?: string;
		created_at?: string;
		height?: number;
		id?: number;
		position?: number;
		product_id?: number;
		src?: string;
		updated_at?: string;
		variant_ids?: Array<number>;
		width?: number;
	}>;
	options?: Array<{
		id?: number;
		name?: string;
		position?: number;
		product_id?: number;
		values?: Array<string>;
	}>;
	product_type?: string;
	published_scope?: string;
	status?: string;
	tags?: string;
	title?: string;
	updated_at?: string;
	variants?: Array<{
		admin_graphql_api_id?: string;
		created_at?: string;
		fulfillment_service?: string;
		grams?: number;
		id?: number;
		inventory_item_id?: number;
		inventory_policy?: string;
		inventory_quantity?: number;
		old_inventory_quantity?: number;
		option1?: string;
		position?: number;
		price?: string;
		product_id?: number;
		requires_shipping?: boolean;
		taxable?: boolean;
		title?: string;
		updated_at?: string;
		weight_unit?: string;
	}>;
	vendor?: string;
};

export type ShopifyV1ProductUpdateOutput = {
	admin_graphql_api_id?: string;
	body_html?: string;
	created_at?: string;
	handle?: string;
	id?: number;
	image?: {
		admin_graphql_api_id?: string;
		created_at?: string;
		height?: number;
		id?: number;
		position?: number;
		product_id?: number;
		src?: string;
		updated_at?: string;
		variant_ids?: Array<number>;
		width?: number;
	};
	images?: Array<{
		admin_graphql_api_id?: string;
		created_at?: string;
		height?: number;
		id?: number;
		position?: number;
		product_id?: number;
		src?: string;
		updated_at?: string;
		variant_ids?: Array<number>;
		width?: number;
	}>;
	options?: Array<{
		id?: number;
		name?: string;
		position?: number;
		product_id?: number;
		values?: Array<string>;
	}>;
	product_type?: string;
	published_scope?: string;
	status?: string;
	tags?: string;
	title?: string;
	updated_at?: string;
	variants?: Array<{
		admin_graphql_api_id?: string;
		created_at?: string;
		fulfillment_service?: string;
		grams?: number;
		id?: number;
		inventory_item_id?: number;
		inventory_policy?: string;
		inventory_quantity?: number;
		old_inventory_quantity?: number;
		option1?: string;
		option3?: null;
		position?: number;
		price?: string;
		product_id?: number;
		requires_shipping?: boolean;
		taxable?: boolean;
		title?: string;
		updated_at?: string;
		weight_unit?: string;
	}>;
	vendor?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ShopifyV1Credentials {
	shopifyApi: CredentialReference;
	shopifyAccessTokenApi: CredentialReference;
	shopifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ShopifyV1NodeBase {
	type: 'n8n-nodes-base.shopify';
	version: 1;
	credentials?: ShopifyV1Credentials;
}

export type ShopifyV1OrderCreateNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1OrderCreateConfig>;
};

export type ShopifyV1OrderDeleteNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1OrderDeleteConfig>;
};

export type ShopifyV1OrderGetNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1OrderGetConfig>;
	output?: ShopifyV1OrderGetOutput;
};

export type ShopifyV1OrderGetAllNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1OrderGetAllConfig>;
	output?: ShopifyV1OrderGetAllOutput;
};

export type ShopifyV1OrderUpdateNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1OrderUpdateConfig>;
};

export type ShopifyV1ProductCreateNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1ProductCreateConfig>;
	output?: ShopifyV1ProductCreateOutput;
};

export type ShopifyV1ProductDeleteNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1ProductDeleteConfig>;
};

export type ShopifyV1ProductGetNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1ProductGetConfig>;
	output?: ShopifyV1ProductGetOutput;
};

export type ShopifyV1ProductGetAllNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1ProductGetAllConfig>;
	output?: ShopifyV1ProductGetAllOutput;
};

export type ShopifyV1ProductUpdateNode = ShopifyV1NodeBase & {
	config: NodeConfig<ShopifyV1ProductUpdateConfig>;
	output?: ShopifyV1ProductUpdateOutput;
};

export type ShopifyV1Node =
	| ShopifyV1OrderCreateNode
	| ShopifyV1OrderDeleteNode
	| ShopifyV1OrderGetNode
	| ShopifyV1OrderGetAllNode
	| ShopifyV1OrderUpdateNode
	| ShopifyV1ProductCreateNode
	| ShopifyV1ProductDeleteNode
	| ShopifyV1ProductGetNode
	| ShopifyV1ProductGetAllNode
	| ShopifyV1ProductUpdateNode
	;