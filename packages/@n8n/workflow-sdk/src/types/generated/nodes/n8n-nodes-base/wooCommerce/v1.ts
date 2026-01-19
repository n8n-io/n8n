/**
 * WooCommerce Node - Version 1
 * Consume WooCommerce API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
	| WooCommerceV1ProductUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type WooCommerceV1CustomerGetOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
		}>;
	};
	avatar_url?: string;
	billing?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		email?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	date_created?: string;
	date_created_gmt?: string;
	date_modified?: string;
	date_modified_gmt?: string;
	email?: string;
	first_name?: string;
	id?: number;
	is_paying_customer?: boolean;
	last_name?: string;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	role?: string;
	shipping?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	username?: string;
};

export type WooCommerceV1CustomerGetAllOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
		}>;
	};
	avatar_url?: string;
	billing?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		email?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	date_created?: string;
	date_created_gmt?: string;
	email?: string;
	first_name?: string;
	id?: number;
	is_paying_customer?: boolean;
	last_name?: string;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	role?: string;
	shipping?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	username?: string;
};

export type WooCommerceV1OrderCreateOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
		}>;
	};
	billing?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		email?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	cart_hash?: string;
	cart_tax?: string;
	created_via?: string;
	currency?: string;
	currency_symbol?: string;
	customer_id?: number;
	customer_ip_address?: string;
	customer_note?: string;
	customer_user_agent?: string;
	date_created?: string;
	date_created_gmt?: string;
	date_modified?: string;
	date_modified_gmt?: string;
	discount_tax?: string;
	discount_total?: string;
	fee_lines?: Array<{
		amount?: string;
		id?: number;
		name?: string;
		tax_class?: string;
		tax_status?: string;
		total?: string;
		total_tax?: string;
	}>;
	id?: number;
	is_editable?: boolean;
	line_items?: Array<{
		id?: number;
		image?: {
			src?: string;
		};
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
		name?: string;
		product_id?: number;
		quantity?: number;
		subtotal?: string;
		subtotal_tax?: string;
		tax_class?: string;
		total?: string;
		total_tax?: string;
		variation_id?: number;
	}>;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	needs_processing?: boolean;
	number?: string;
	order_key?: string;
	parent_id?: number;
	payment_method?: string;
	payment_method_title?: string;
	payment_url?: string;
	prices_include_tax?: boolean;
	shipping?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	shipping_lines?: Array<{
		id?: number;
		instance_id?: string;
		method_id?: string;
		method_title?: string;
		total?: string;
		total_tax?: string;
	}>;
	shipping_tax?: string;
	shipping_total?: string;
	status?: string;
	total?: string;
	total_tax?: string;
	transaction_id?: string;
	version?: string;
};

export type WooCommerceV1OrderGetOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
	};
	billing?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		email?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	cart_hash?: string;
	cart_tax?: string;
	coupon_lines?: Array<{
		code?: string;
		discount?: string;
		discount_tax?: string;
		discount_type?: string;
		free_shipping?: boolean;
		id?: number;
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
	}>;
	created_via?: string;
	currency?: string;
	currency_symbol?: string;
	customer_id?: number;
	customer_ip_address?: string;
	customer_note?: string;
	customer_user_agent?: string;
	date_created?: string;
	date_created_gmt?: string;
	date_modified?: string;
	date_modified_gmt?: string;
	discount_tax?: string;
	discount_total?: string;
	fee_lines?: Array<{
		amount?: string;
		id?: number;
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
		name?: string;
		tax_class?: string;
		tax_status?: string;
		total?: string;
		total_tax?: string;
	}>;
	id?: number;
	is_editable?: boolean;
	line_items?: Array<{
		id?: number;
		image?: {
			src?: string;
		};
		meta_data?: Array<{
			display_key?: string;
			id?: number;
			key?: string;
		}>;
		name?: string;
		product_id?: number;
		quantity?: number;
		subtotal?: string;
		subtotal_tax?: string;
		tax_class?: string;
		taxes?: Array<{
			id?: number;
			subtotal?: string;
			total?: string;
		}>;
		total?: string;
		total_tax?: string;
		variation_id?: number;
	}>;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	needs_payment?: boolean;
	needs_processing?: boolean;
	number?: string;
	order_key?: string;
	parent_id?: number;
	payment_method?: string;
	payment_method_title?: string;
	payment_url?: string;
	prices_include_tax?: boolean;
	refunds?: Array<{
		id?: number;
		reason?: string;
		total?: string;
	}>;
	shipping?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	shipping_lines?: Array<{
		id?: number;
		instance_id?: string;
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
		method_id?: string;
		method_title?: string;
		tax_status?: string;
		taxes?: Array<{
			id?: number;
			subtotal?: string;
			total?: string;
		}>;
		total?: string;
		total_tax?: string;
	}>;
	shipping_tax?: string;
	shipping_total?: string;
	status?: string;
	tax_lines?: Array<{
		compound?: boolean;
		id?: number;
		label?: string;
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
		rate_code?: string;
		rate_id?: number;
		shipping_tax_total?: string;
		tax_total?: string;
	}>;
	total?: string;
	total_tax?: string;
	transaction_id?: string;
	version?: string;
};

export type WooCommerceV1OrderGetAllOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
	};
	billing?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		email?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	cart_hash?: string;
	cart_tax?: string;
	coupon_lines?: Array<{
		code?: string;
		discount?: string;
		discount_tax?: string;
		discount_type?: string;
		free_shipping?: boolean;
		id?: number;
		meta_data?: Array<{
			display_key?: string;
			id?: number;
			key?: string;
		}>;
	}>;
	created_via?: string;
	currency?: string;
	currency_symbol?: string;
	customer_id?: number;
	customer_ip_address?: string;
	customer_note?: string;
	customer_user_agent?: string;
	date_created?: string;
	date_created_gmt?: string;
	date_modified?: string;
	date_modified_gmt?: string;
	discount_tax?: string;
	discount_total?: string;
	fee_lines?: Array<{
		amount?: string;
		id?: number;
		name?: string;
		tax_class?: string;
		tax_status?: string;
		taxes?: Array<{
			id?: number;
			subtotal?: string;
			total?: string;
		}>;
		total?: string;
		total_tax?: string;
	}>;
	id?: number;
	is_editable?: boolean;
	line_items?: Array<{
		id?: number;
		image?: {
			src?: string;
		};
		meta_data?: Array<{
			display_key?: string;
			id?: number;
			key?: string;
		}>;
		name?: string;
		product_id?: number;
		quantity?: number;
		subtotal?: string;
		subtotal_tax?: string;
		tax_class?: string;
		taxes?: Array<{
			id?: number;
			subtotal?: string;
			total?: string;
		}>;
		total?: string;
		total_tax?: string;
		variation_id?: number;
	}>;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	needs_processing?: boolean;
	number?: string;
	order_key?: string;
	parent_id?: number;
	payment_method?: string;
	payment_method_title?: string;
	payment_url?: string;
	prices_include_tax?: boolean;
	refunds?: Array<{
		id?: number;
		reason?: string;
		total?: string;
	}>;
	shipping?: {
		address_1?: string;
		address_2?: string;
		city?: string;
		company?: string;
		country?: string;
		first_name?: string;
		last_name?: string;
		phone?: string;
		postcode?: string;
		state?: string;
	};
	shipping_lines?: Array<{
		id?: number;
		instance_id?: string;
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
		method_id?: string;
		method_title?: string;
		taxes?: Array<{
			id?: number;
			subtotal?: string;
			total?: string;
		}>;
		total?: string;
		total_tax?: string;
	}>;
	shipping_tax?: string;
	shipping_total?: string;
	status?: string;
	tax_lines?: Array<{
		compound?: boolean;
		id?: number;
		label?: string;
		meta_data?: Array<{
			display_key?: string;
			display_value?: string;
			id?: number;
			key?: string;
			value?: string;
		}>;
		rate_code?: string;
		shipping_tax_total?: string;
		tax_total?: string;
	}>;
	total?: string;
	total_tax?: string;
	transaction_id?: string;
	version?: string;
};

export type WooCommerceV1ProductCreateOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
		}>;
	};
	average_rating?: string;
	backordered?: boolean;
	backorders?: string;
	backorders_allowed?: boolean;
	button_text?: string;
	catalog_visibility?: string;
	categories?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	date_created?: string;
	date_created_gmt?: string;
	date_modified?: string;
	date_modified_gmt?: string;
	date_on_sale_from?: null;
	date_on_sale_from_gmt?: null;
	date_on_sale_to?: null;
	date_on_sale_to_gmt?: null;
	description?: string;
	dimensions?: {
		height?: string;
		length?: string;
		width?: string;
	};
	download_expiry?: number;
	download_limit?: number;
	downloadable?: boolean;
	external_url?: string;
	featured?: boolean;
	generated_slug?: string;
	global_unique_id?: string;
	has_options?: boolean;
	id?: number;
	images?: Array<{
		alt?: string;
		date_created?: string;
		date_created_gmt?: string;
		date_modified?: string;
		date_modified_gmt?: string;
		id?: number;
		name?: string;
		src?: string;
	}>;
	manage_stock?: boolean;
	menu_order?: number;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	name?: string;
	on_sale?: boolean;
	parent_id?: number;
	permalink?: string;
	permalink_template?: string;
	post_password?: string;
	price?: string;
	price_html?: string;
	purchasable?: boolean;
	purchase_note?: string;
	rating_count?: number;
	regular_price?: string;
	related_ids?: Array<number>;
	reviews_allowed?: boolean;
	sale_price?: string;
	shipping_class?: string;
	shipping_class_id?: number;
	shipping_required?: boolean;
	shipping_taxable?: boolean;
	short_description?: string;
	sku?: string;
	slug?: string;
	sold_individually?: boolean;
	status?: string;
	stock_status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	tax_class?: string;
	tax_status?: string;
	total_sales?: number;
	type?: string;
	virtual?: boolean;
	weight?: string;
};

export type WooCommerceV1ProductGetOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
	};
	attributes?: Array<{
		id?: number;
		name?: string;
		options?: Array<string>;
		position?: number;
		slug?: string;
		variation?: boolean;
		visible?: boolean;
	}>;
	average_rating?: string;
	backordered?: boolean;
	backorders?: string;
	backorders_allowed?: boolean;
	brands?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	button_text?: string;
	catalog_visibility?: string;
	categories?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	cross_sell_ids?: Array<number>;
	date_modified?: string;
	date_modified_gmt?: string;
	default_attributes?: Array<{
		id?: number;
		name?: string;
		option?: string;
	}>;
	description?: string;
	dimensions?: {
		height?: string;
		length?: string;
		width?: string;
	};
	download_expiry?: number;
	download_limit?: number;
	downloadable?: boolean;
	downloads?: Array<{
		file?: string;
		id?: string;
		name?: string;
	}>;
	external_url?: string;
	featured?: boolean;
	global_unique_id?: string;
	has_options?: boolean;
	id?: number;
	images?: Array<{
		alt?: string;
		date_created?: string;
		date_created_gmt?: string;
		date_modified?: string;
		date_modified_gmt?: string;
		id?: number;
		name?: string;
		src?: string;
	}>;
	manage_stock?: boolean;
	menu_order?: number;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	name?: string;
	on_sale?: boolean;
	parent_id?: number;
	permalink?: string;
	post_password?: string;
	price_html?: string;
	purchasable?: boolean;
	purchase_note?: string;
	rating_count?: number;
	related_ids?: Array<number>;
	reviews_allowed?: boolean;
	sale_price?: string;
	shipping_class?: string;
	shipping_class_id?: number;
	shipping_required?: boolean;
	shipping_taxable?: boolean;
	short_description?: string;
	sku?: string;
	slug?: string;
	sold_individually?: boolean;
	status?: string;
	stock_status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	tax_class?: string;
	tax_status?: string;
	type?: string;
	upsell_ids?: Array<number>;
	variations?: Array<number>;
	virtual?: boolean;
	weight?: string;
};

export type WooCommerceV1ProductGetAllOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
	};
	attributes?: Array<{
		id?: number;
		name?: string;
		options?: Array<string>;
		position?: number;
		slug?: string;
		variation?: boolean;
		visible?: boolean;
	}>;
	average_rating?: string;
	backordered?: boolean;
	backorders?: string;
	backorders_allowed?: boolean;
	brands?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	button_text?: string;
	catalog_visibility?: string;
	categories?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	cross_sell_ids?: Array<number>;
	date_modified?: string;
	date_modified_gmt?: string;
	date_on_sale_from?: null;
	date_on_sale_from_gmt?: null;
	date_on_sale_to?: null;
	date_on_sale_to_gmt?: null;
	default_attributes?: Array<{
		id?: number;
		name?: string;
		option?: string;
	}>;
	description?: string;
	dimensions?: {
		height?: string;
		length?: string;
		width?: string;
	};
	download_expiry?: number;
	download_limit?: number;
	downloadable?: boolean;
	downloads?: Array<{
		file?: string;
		id?: string;
		name?: string;
	}>;
	external_url?: string;
	featured?: boolean;
	global_unique_id?: string;
	grouped_products?: Array<number>;
	has_options?: boolean;
	id?: number;
	images?: Array<{
		alt?: string;
		date_created?: string;
		date_created_gmt?: string;
		date_modified?: string;
		date_modified_gmt?: string;
		id?: number;
		name?: string;
		src?: string;
	}>;
	manage_stock?: boolean;
	menu_order?: number;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	name?: string;
	on_sale?: boolean;
	parent_id?: number;
	permalink?: string;
	post_password?: string;
	price_html?: string;
	purchasable?: boolean;
	purchase_note?: string;
	rating_count?: number;
	related_ids?: Array<number>;
	reviews_allowed?: boolean;
	shipping_class?: string;
	shipping_class_id?: number;
	shipping_required?: boolean;
	shipping_taxable?: boolean;
	short_description?: string;
	sku?: string;
	slug?: string;
	sold_individually?: boolean;
	status?: string;
	stock_status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	tax_class?: string;
	tax_status?: string;
	type?: string;
	upsell_ids?: Array<number>;
	variations?: Array<number>;
	virtual?: boolean;
	weight?: string;
};

export type WooCommerceV1ProductUpdateOutput = {
	_links?: {
		collection?: Array<{
			href?: string;
		}>;
		self?: Array<{
			href?: string;
			targetHints?: {
				allow?: Array<string>;
			};
		}>;
	};
	attributes?: Array<{
		id?: number;
		name?: string;
		options?: Array<string>;
		position?: number;
		slug?: string;
		variation?: boolean;
		visible?: boolean;
	}>;
	average_rating?: string;
	backordered?: boolean;
	backorders?: string;
	backorders_allowed?: boolean;
	button_text?: string;
	catalog_visibility?: string;
	categories?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	cross_sell_ids?: Array<number>;
	date_modified?: string;
	date_modified_gmt?: string;
	date_on_sale_from?: null;
	date_on_sale_from_gmt?: null;
	date_on_sale_to?: null;
	date_on_sale_to_gmt?: null;
	default_attributes?: Array<{
		id?: number;
		name?: string;
		option?: string;
	}>;
	description?: string;
	dimensions?: {
		height?: string;
		length?: string;
		width?: string;
	};
	download_expiry?: number;
	download_limit?: number;
	downloadable?: boolean;
	downloads?: Array<{
		file?: string;
		id?: string;
		name?: string;
	}>;
	external_url?: string;
	featured?: boolean;
	generated_slug?: string;
	global_unique_id?: string;
	has_options?: boolean;
	id?: number;
	images?: Array<{
		alt?: string;
		date_created?: string;
		date_created_gmt?: string;
		date_modified?: string;
		date_modified_gmt?: string;
		id?: number;
		name?: string;
		src?: string;
	}>;
	manage_stock?: boolean;
	menu_order?: number;
	meta_data?: Array<{
		id?: number;
		key?: string;
	}>;
	name?: string;
	on_sale?: boolean;
	parent_id?: number;
	permalink?: string;
	permalink_template?: string;
	post_password?: string;
	price?: string;
	price_html?: string;
	purchasable?: boolean;
	purchase_note?: string;
	rating_count?: number;
	regular_price?: string;
	related_ids?: Array<number>;
	reviews_allowed?: boolean;
	sale_price?: string;
	shipping_class?: string;
	shipping_class_id?: number;
	shipping_required?: boolean;
	shipping_taxable?: boolean;
	short_description?: string;
	sku?: string;
	slug?: string;
	sold_individually?: boolean;
	status?: string;
	stock_status?: string;
	tags?: Array<{
		id?: number;
		name?: string;
		slug?: string;
	}>;
	tax_class?: string;
	tax_status?: string;
	total_sales?: number;
	type?: string;
	upsell_ids?: Array<number>;
	variations?: Array<number>;
	virtual?: boolean;
	weight?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface WooCommerceV1Credentials {
	wooCommerceApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WooCommerceV1NodeBase {
	type: 'n8n-nodes-base.wooCommerce';
	version: 1;
	credentials?: WooCommerceV1Credentials;
}

export type WooCommerceV1CustomerCreateNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1CustomerCreateConfig>;
};

export type WooCommerceV1CustomerDeleteNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1CustomerDeleteConfig>;
};

export type WooCommerceV1CustomerGetNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1CustomerGetConfig>;
	output?: WooCommerceV1CustomerGetOutput;
};

export type WooCommerceV1CustomerGetAllNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1CustomerGetAllConfig>;
	output?: WooCommerceV1CustomerGetAllOutput;
};

export type WooCommerceV1CustomerUpdateNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1CustomerUpdateConfig>;
};

export type WooCommerceV1OrderCreateNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1OrderCreateConfig>;
	output?: WooCommerceV1OrderCreateOutput;
};

export type WooCommerceV1OrderDeleteNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1OrderDeleteConfig>;
};

export type WooCommerceV1OrderGetNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1OrderGetConfig>;
	output?: WooCommerceV1OrderGetOutput;
};

export type WooCommerceV1OrderGetAllNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1OrderGetAllConfig>;
	output?: WooCommerceV1OrderGetAllOutput;
};

export type WooCommerceV1OrderUpdateNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1OrderUpdateConfig>;
};

export type WooCommerceV1ProductCreateNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1ProductCreateConfig>;
	output?: WooCommerceV1ProductCreateOutput;
};

export type WooCommerceV1ProductDeleteNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1ProductDeleteConfig>;
};

export type WooCommerceV1ProductGetNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1ProductGetConfig>;
	output?: WooCommerceV1ProductGetOutput;
};

export type WooCommerceV1ProductGetAllNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1ProductGetAllConfig>;
	output?: WooCommerceV1ProductGetAllOutput;
};

export type WooCommerceV1ProductUpdateNode = WooCommerceV1NodeBase & {
	config: NodeConfig<WooCommerceV1ProductUpdateConfig>;
	output?: WooCommerceV1ProductUpdateOutput;
};

export type WooCommerceV1Node =
	| WooCommerceV1CustomerCreateNode
	| WooCommerceV1CustomerDeleteNode
	| WooCommerceV1CustomerGetNode
	| WooCommerceV1CustomerGetAllNode
	| WooCommerceV1CustomerUpdateNode
	| WooCommerceV1OrderCreateNode
	| WooCommerceV1OrderDeleteNode
	| WooCommerceV1OrderGetNode
	| WooCommerceV1OrderGetAllNode
	| WooCommerceV1OrderUpdateNode
	| WooCommerceV1ProductCreateNode
	| WooCommerceV1ProductDeleteNode
	| WooCommerceV1ProductGetNode
	| WooCommerceV1ProductGetAllNode
	| WooCommerceV1ProductUpdateNode
	;