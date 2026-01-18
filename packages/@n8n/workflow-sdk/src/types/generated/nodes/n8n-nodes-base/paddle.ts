/**
 * Paddle Node Types
 *
 * Consume Paddle API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/paddle/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a coupon */
export type PaddleV1CouponCreateConfig = {
	resource: 'coupon';
	operation: 'create';
	/**
	 * Either product (valid for specified products or subscription plans) or checkout (valid for any checkout)
	 * @default checkout
	 */
	couponType?: 'checkout' | 'product' | Expression<string>;
	/**
	 * Comma-separated list of product IDs. Required if coupon_type is product. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	productIds: string[];
	/**
	 * Either flat or percentage
	 * @default flat
	 */
	discountType?: 'flat' | 'percentage' | Expression<string>;
	/**
	 * Discount amount in currency
	 * @default 1
	 */
	discountAmount?: number | Expression<number>;
	/**
	 * The currency must match the balance currency specified in your account
	 * @default EUR
	 */
	currency?:
		| 'ARS'
		| 'AUD'
		| 'BRL'
		| 'CAD'
		| 'CHF'
		| 'CNY'
		| 'CZK'
		| 'DKK'
		| 'EUR'
		| 'GBP'
		| 'HKD'
		| 'HUF'
		| 'INR'
		| 'JPY'
		| 'KRW'
		| 'MXN'
		| 'NOK'
		| 'NZD'
		| 'PLN'
		| 'RUB'
		| 'SEK'
		| 'SGD'
		| 'THB'
		| 'TWD'
		| 'USD'
		| 'ZAR'
		| Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Attributes in JSON form
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
	 */
	productId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default couponCode
	 */
	updateBy?: 'couponCode' | 'group' | Expression<string>;
	/**
	 * Identify the coupon to update
	 */
	couponCode?: string | Expression<string>;
	/**
	 * The name of the group of coupons you want to update
	 */
	group?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Attributes in JSON form
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Attributes in JSON form
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
	 */
	paymentId: string | Expression<string>;
	/**
	 * Date you want to move the payment to
	 */
	date?: string | Expression<string>;
};

/** Get a plan */
export type PaddleV1PlanGetConfig = {
	resource: 'plan';
	operation: 'get';
	/**
	 * Filter: The subscription plan ID
	 */
	planId: string | Expression<string>;
};

/** Get many coupons */
export type PaddleV1PlanGetAllConfig = {
	resource: 'plan';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Attributes in JSON form
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
	| PaddleV1UserGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PaddleV1Credentials {
	paddleApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PaddleNode = {
	type: 'n8n-nodes-base.paddle';
	version: 1;
	config: NodeConfig<PaddleV1Params>;
	credentials?: PaddleV1Credentials;
};
