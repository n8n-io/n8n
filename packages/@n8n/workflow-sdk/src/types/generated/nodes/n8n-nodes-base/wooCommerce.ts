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
	billingUi?: {
		billingValues?: {
			firstName?: string | Expression<string>;
			lastName?: string | Expression<string>;
			company?: string | Expression<string>;
			address_1?: string | Expression<string>;
			address_2?: string | Expression<string>;
			city?: string | Expression<string>;
			postcode?: string | Expression<string>;
			country?: string | Expression<string>;
			email?: string | Expression<string>;
			phone?: string | Expression<string>;
		};
	};
	/**
	 * Coupons line data
	 * @default {}
	 */
	couponLinesUi?: {
		couponLinesValues?: Array<{
			code?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Fee line data
	 * @default {}
	 */
	feeLinesUi?: {
		feeLinesValues?: Array<{
			name?: string | Expression<string>;
			taxClass?: string | Expression<string>;
			taxStatus?: 'taxable' | 'none' | Expression<string>;
			total?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Line item data
	 * @default {}
	 */
	lineItemsUi?: {
		lineItemsValues?: Array<{
			name?: string | Expression<string>;
			productId?: number | Expression<number>;
			variationId?: number | Expression<number>;
			quantity?: number | Expression<number>;
			taxClass?: string | Expression<string>;
			subtotal?: string | Expression<string>;
			total?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Shipping address
	 * @default {}
	 */
	shippingUi?: {
		shippingValues?: {
			firstName?: string | Expression<string>;
			lastName?: string | Expression<string>;
			company?: string | Expression<string>;
			address_1?: string | Expression<string>;
			address_2?: string | Expression<string>;
			city?: string | Expression<string>;
			postcode?: string | Expression<string>;
			country?: string | Expression<string>;
		};
	};
	/**
	 * Shipping line data
	 * @default {}
	 */
	shippingLinesUi?: {
		shippingLinesValues?: Array<{
			methodTitle?: string | Expression<string>;
			'method ID'?: string | Expression<string>;
			total?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
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
	billingUi?: {
		billingValues?: {
			firstName?: string | Expression<string>;
			lastName?: string | Expression<string>;
			company?: string | Expression<string>;
			address_1?: string | Expression<string>;
			address_2?: string | Expression<string>;
			city?: string | Expression<string>;
			postalCode?: string | Expression<string>;
			country?: string | Expression<string>;
			email?: string | Expression<string>;
			phone?: string | Expression<string>;
		};
	};
	/**
	 * Coupons line data
	 * @default {}
	 */
	couponLinesUi?: {
		couponLinesValues?: Array<{
			code?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Fee line data
	 * @default {}
	 */
	feeLinesUi?: {
		feeLinesValues?: Array<{
			name?: string | Expression<string>;
			taxClass?: string | Expression<string>;
			taxStatus?: 'taxable' | 'none' | Expression<string>;
			total?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Line item data
	 * @default {}
	 */
	lineItemsUi?: {
		lineItemsValues?: Array<{
			name?: string | Expression<string>;
			productId?: number | Expression<number>;
			variationId?: number | Expression<number>;
			quantity?: number | Expression<number>;
			taxClass?: string | Expression<string>;
			subtotal?: string | Expression<string>;
			total?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Shipping address
	 * @default {}
	 */
	shippingUi?: {
		shippingValues?: {
			firstName?: string | Expression<string>;
			lastName?: string | Expression<string>;
			company?: string | Expression<string>;
			address_1?: string | Expression<string>;
			address_2?: string | Expression<string>;
			city?: string | Expression<string>;
			postalCode?: string | Expression<string>;
			country?: string | Expression<string>;
		};
	};
	/**
	 * Shipping line data
	 * @default {}
	 */
	shippingLinesUi?: {
		shippingLinesValues?: Array<{
			methodTitle?: string | Expression<string>;
			'method ID'?: string | Expression<string>;
			total?: string | Expression<string>;
			metadataUi?: {
				metadataValues?: Array<{
					key?: string | Expression<string>;
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
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
	dimensionsUi?: {
		dimensionsValues?: {
			height?: string | Expression<string>;
			length?: string | Expression<string>;
			width?: string | Expression<string>;
		};
	};
	/**
	 * Product Image
	 * @default {}
	 */
	imagesUi?: {
		imagesValues?: Array<{
			alt?: string | Expression<string>;
			src?: string | Expression<string>;
			name?: string | Expression<string>;
		}>;
	};
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
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
	dimensionsUi?: {
		dimensionsValues?: {
			height?: string | Expression<string>;
			length?: string | Expression<string>;
			width?: string | Expression<string>;
		};
	};
	/**
	 * Product Image
	 * @default {}
	 */
	imagesUi?: {
		imagesValues?: Array<{
			alt?: string | Expression<string>;
			src?: string | Expression<string>;
			name?: string | Expression<string>;
		}>;
	};
	/**
	 * Meta data
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
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
