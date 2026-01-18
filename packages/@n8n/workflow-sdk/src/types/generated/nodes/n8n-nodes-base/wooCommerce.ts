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
	 * @displayOptions.show { resource: ["customer"], operation: ["delete"] }
	 */
	customerId: string | Expression<string>;
};

/** Retrieve a customer */
export type WooCommerceV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
	/**
	 * ID of the customer to retrieve
	 * @displayOptions.show { resource: ["customer"], operation: ["get"] }
	 */
	customerId: string | Expression<string>;
};

/** Retrieve many customers */
export type WooCommerceV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["customer"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["customer"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["customer"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	billingUi?: {
		billingValues?: {
			/** First Name
			 */
			firstName?: string | Expression<string>;
			/** Last Name
			 */
			lastName?: string | Expression<string>;
			/** Company
			 */
			company?: string | Expression<string>;
			/** Address Line 1
			 */
			address_1?: string | Expression<string>;
			/** Address Line 2
			 */
			address_2?: string | Expression<string>;
			/** ISO code or name of the state, province or district
			 */
			city?: string | Expression<string>;
			/** Postal Code
			 */
			postcode?: string | Expression<string>;
			/** Country
			 */
			country?: string | Expression<string>;
			/** Email
			 */
			email?: string | Expression<string>;
			/** Phone
			 */
			phone?: string | Expression<string>;
		};
	};
	/**
	 * Coupons line data
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	couponLinesUi?: {
		couponLinesValues?: Array<{
			/** Coupon code
			 */
			code?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Fee line data
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	feeLinesUi?: {
		feeLinesValues?: Array<{
			/** Fee name
			 */
			name?: string | Expression<string>;
			/** Tax class of fee
			 */
			taxClass?: string | Expression<string>;
			/** Tax class of fee
			 */
			taxStatus?: 'taxable' | 'none' | Expression<string>;
			/** Line total (after discounts)
			 */
			total?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Line item data
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	lineItemsUi?: {
		lineItemsValues?: Array<{
			/** Product name
			 */
			name?: string | Expression<string>;
			/** Product ID
			 * @default 0
			 */
			productId?: number | Expression<number>;
			/** Variation ID, if applicable
			 * @default 0
			 */
			variationId?: number | Expression<number>;
			/** Quantity ordered
			 * @default 1
			 */
			quantity?: number | Expression<number>;
			/** Slug of the tax class of product
			 */
			taxClass?: string | Expression<string>;
			/** Line subtotal (before discounts)
			 */
			subtotal?: string | Expression<string>;
			/** Line total (after discounts)
			 */
			total?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Meta data
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			/** Name of the metadata key to add
			 */
			key?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Shipping address
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	shippingUi?: {
		shippingValues?: {
			/** First Name
			 */
			firstName?: string | Expression<string>;
			/** Last Name
			 */
			lastName?: string | Expression<string>;
			/** Company
			 */
			company?: string | Expression<string>;
			/** Address Line 1
			 */
			address_1?: string | Expression<string>;
			/** Address Line 2
			 */
			address_2?: string | Expression<string>;
			/** ISO code or name of the state, province or district
			 */
			city?: string | Expression<string>;
			/** Postal Code
			 */
			postcode?: string | Expression<string>;
			/** Country
			 */
			country?: string | Expression<string>;
		};
	};
	/**
	 * Shipping line data
	 * @displayOptions.show { resource: ["order"], operation: ["create"] }
	 * @default {}
	 */
	shippingLinesUi?: {
		shippingLinesValues?: Array<{
			/** Shipping method name
			 */
			methodTitle?: string | Expression<string>;
			/** Shipping method ID
			 */
			'method ID'?: string | Expression<string>;
			/** Line total (after discounts)
			 */
			total?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
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

/** Update a customer */
export type WooCommerceV1OrderUpdateConfig = {
	resource: 'order';
	operation: 'update';
	orderId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	/**
	 * Billing address
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	billingUi?: {
		billingValues?: {
			/** First Name
			 */
			firstName?: string | Expression<string>;
			/** Last Name
			 */
			lastName?: string | Expression<string>;
			/** Company
			 */
			company?: string | Expression<string>;
			/** Address Line 1
			 */
			address_1?: string | Expression<string>;
			/** Address Line 2
			 */
			address_2?: string | Expression<string>;
			/** ISO code or name of the state, province or district
			 */
			city?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
			/** Country
			 */
			country?: string | Expression<string>;
			/** Email
			 */
			email?: string | Expression<string>;
			/** Phone
			 */
			phone?: string | Expression<string>;
		};
	};
	/**
	 * Coupons line data
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	couponLinesUi?: {
		couponLinesValues?: Array<{
			/** Coupon code
			 */
			code?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Fee line data
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	feeLinesUi?: {
		feeLinesValues?: Array<{
			/** Fee name
			 */
			name?: string | Expression<string>;
			/** Tax class of fee
			 */
			taxClass?: string | Expression<string>;
			/** Tax class of fee
			 */
			taxStatus?: 'taxable' | 'none' | Expression<string>;
			/** Line total (after discounts)
			 */
			total?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Line item data
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	lineItemsUi?: {
		lineItemsValues?: Array<{
			/** Product name
			 */
			name?: string | Expression<string>;
			/** Product ID
			 * @default 0
			 */
			productId?: number | Expression<number>;
			/** Variation ID, if applicable
			 * @default 0
			 */
			variationId?: number | Expression<number>;
			/** Quantity ordered
			 * @default 1
			 */
			quantity?: number | Expression<number>;
			/** Slug of the tax class of product
			 */
			taxClass?: string | Expression<string>;
			/** Line subtotal (before discounts)
			 */
			subtotal?: string | Expression<string>;
			/** Line total (after discounts)
			 */
			total?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
					value?: string | Expression<string>;
				}>;
			};
		}>;
	};
	/**
	 * Meta data
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			/** Name of the metadata key to add
			 */
			key?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Shipping address
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	shippingUi?: {
		shippingValues?: {
			/** First Name
			 */
			firstName?: string | Expression<string>;
			/** Last Name
			 */
			lastName?: string | Expression<string>;
			/** Company
			 */
			company?: string | Expression<string>;
			/** Address Line 1
			 */
			address_1?: string | Expression<string>;
			/** Address Line 2
			 */
			address_2?: string | Expression<string>;
			/** ISO code or name of the state, province or district
			 */
			city?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
			/** Country
			 */
			country?: string | Expression<string>;
		};
	};
	/**
	 * Shipping line data
	 * @displayOptions.show { resource: ["order"], operation: ["update"] }
	 * @default {}
	 */
	shippingLinesUi?: {
		shippingLinesValues?: Array<{
			/** Shipping method name
			 */
			methodTitle?: string | Expression<string>;
			/** Shipping method ID
			 */
			'method ID'?: string | Expression<string>;
			/** Line total (after discounts)
			 */
			total?: string | Expression<string>;
			/** Meta data
			 * @default {}
			 */
			metadataUi?: {
				metadataValues?: Array<{
					/** Name of the metadata key to add
					 */
					key?: string | Expression<string>;
					/** Value to set for the metadata key
					 */
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
	 * @displayOptions.show { resource: ["product"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Product dimensions
	 * @displayOptions.show { resource: ["product"], operation: ["create"] }
	 * @default {}
	 */
	dimensionsUi?: {
		dimensionsValues?: {
			/** Product height
			 */
			height?: string | Expression<string>;
			/** Product length
			 */
			length?: string | Expression<string>;
			/** Product width
			 */
			width?: string | Expression<string>;
		};
	};
	/**
	 * Product Image
	 * @displayOptions.show { resource: ["product"], operation: ["create"] }
	 * @default {}
	 */
	imagesUi?: {
		imagesValues?: Array<{
			/** Image alternative text
			 */
			alt?: string | Expression<string>;
			/** Image URL
			 */
			src?: string | Expression<string>;
			/** Image name
			 */
			name?: string | Expression<string>;
		}>;
	};
	/**
	 * Meta data
	 * @displayOptions.show { resource: ["product"], operation: ["create"] }
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			/** Name of the metadata key to add
			 */
			key?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
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
	 * @displayOptions.show { resource: ["product"], operation: ["update"] }
	 * @default {}
	 */
	dimensionsUi?: {
		dimensionsValues?: {
			/** Product height
			 */
			height?: string | Expression<string>;
			/** Product length
			 */
			length?: string | Expression<string>;
			/** Product width
			 */
			width?: string | Expression<string>;
		};
	};
	/**
	 * Product Image
	 * @displayOptions.show { resource: ["product"], operation: ["update"] }
	 * @default {}
	 */
	imagesUi?: {
		imagesValues?: Array<{
			/** Image alternative text
			 */
			alt?: string | Expression<string>;
			/** Image URL
			 */
			src?: string | Expression<string>;
			/** Image name
			 */
			name?: string | Expression<string>;
		}>;
	};
	/**
	 * Meta data
	 * @displayOptions.show { resource: ["product"], operation: ["update"] }
	 * @default {}
	 */
	metadataUi?: {
		metadataValues?: Array<{
			/** Name of the metadata key to add
			 */
			key?: string | Expression<string>;
			/** Value to set for the metadata key
			 */
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
