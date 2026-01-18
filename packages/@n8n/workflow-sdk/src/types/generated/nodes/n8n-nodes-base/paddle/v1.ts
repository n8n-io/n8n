/**
 * Paddle Node - Version 1
 * Consume Paddle API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a coupon */
export type PaddleV1CouponCreateConfig = {
	resource: 'coupon';
	operation: 'create';
/**
 * Either product (valid for specified products or subscription plans) or checkout (valid for any checkout)
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], jsonParameters: [false] }
 * @default checkout
 */
		couponType?: 'checkout' | 'product' | Expression<string>;
/**
 * Comma-separated list of product IDs. Required if coupon_type is product. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], couponType: ["product"], jsonParameters: [false] }
 * @default []
 */
		productIds: string[];
/**
 * Either flat or percentage
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], jsonParameters: [false] }
 * @default flat
 */
		discountType?: 'flat' | 'percentage' | Expression<string>;
/**
 * Discount amount in currency
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], discountType: ["flat"], jsonParameters: [false] }
 * @default 1
 */
		discountAmount?: number | Expression<number>;
/**
 * The currency must match the balance currency specified in your account
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], discountType: ["flat"], jsonParameters: [false] }
 * @default EUR
 */
		currency?: 'ARS' | 'AUD' | 'BRL' | 'CAD' | 'CHF' | 'CNY' | 'CZK' | 'DKK' | 'EUR' | 'GBP' | 'HKD' | 'HUF' | 'INR' | 'JPY' | 'KRW' | 'MXN' | 'NOK' | 'NZD' | 'PLN' | 'RUB' | 'SEK' | 'SGD' | 'THB' | 'TWD' | 'USD' | 'ZAR' | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Attributes in JSON form
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many coupons */
export type PaddleV1CouponGetAllConfig = {
	resource: 'coupon';
	operation: 'getAll';
/**
 * The specific product/subscription ID
 * @displayOptions.show { resource: ["coupon"], operation: ["getAll"] }
 */
		productId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["coupon"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["coupon"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update a coupon */
export type PaddleV1CouponUpdateConfig = {
	resource: 'coupon';
	operation: 'update';
/**
 * Either flat or percentage
 * @displayOptions.show { resource: ["coupon"], operation: ["update"], jsonParameters: [false] }
 * @default couponCode
 */
		updateBy?: 'couponCode' | 'group' | Expression<string>;
/**
 * Identify the coupon to update
 * @displayOptions.show { resource: ["coupon"], operation: ["update"], updateBy: ["couponCode"], jsonParameters: [false] }
 */
		couponCode?: string | Expression<string>;
/**
 * The name of the group of coupons you want to update
 * @displayOptions.show { resource: ["coupon"], operation: ["update"], updateBy: ["group"], jsonParameters: [false] }
 */
		group?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Attributes in JSON form
 * @displayOptions.show { resource: ["coupon"], operation: ["update"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many coupons */
export type PaddleV1PaymentGetAllConfig = {
	resource: 'payment';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["payment"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["payment"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Attributes in JSON form
 * @displayOptions.show { resource: ["payment"], operation: ["getAll"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Reschedule payment */
export type PaddleV1PaymentRescheduleConfig = {
	resource: 'payment';
	operation: 'reschedule';
/**
 * The upcoming subscription payment ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["payment"], operation: ["reschedule"] }
 */
		paymentId: string | Expression<string>;
/**
 * Date you want to move the payment to
 * @displayOptions.show { resource: ["payment"], operation: ["reschedule"] }
 */
		date?: string | Expression<string>;
};

/** Get a plan */
export type PaddleV1PlanGetConfig = {
	resource: 'plan';
	operation: 'get';
/**
 * Filter: The subscription plan ID
 * @displayOptions.show { resource: ["plan"], operation: ["get"] }
 */
		planId: string | Expression<string>;
};

/** Get many coupons */
export type PaddleV1PlanGetAllConfig = {
	resource: 'plan';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["plan"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["plan"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Get many coupons */
export type PaddleV1ProductGetAllConfig = {
	resource: 'product';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["product"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["product"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Get many coupons */
export type PaddleV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Attributes in JSON form
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type PaddleV1Params =
	| PaddleV1CouponCreateConfig
	| PaddleV1CouponGetAllConfig
	| PaddleV1CouponUpdateConfig
	| PaddleV1PaymentGetAllConfig
	| PaddleV1PaymentRescheduleConfig
	| PaddleV1PlanGetConfig
	| PaddleV1PlanGetAllConfig
	| PaddleV1ProductGetAllConfig
	| PaddleV1UserGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PaddleV1Credentials {
	paddleApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PaddleV1Node = {
	type: 'n8n-nodes-base.paddle';
	version: 1;
	config: NodeConfig<PaddleV1Params>;
	credentials?: PaddleV1Credentials;
};