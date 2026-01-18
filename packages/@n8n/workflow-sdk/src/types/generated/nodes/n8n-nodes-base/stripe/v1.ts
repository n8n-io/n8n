/**
 * Stripe Node - Version 1
 * Consume the Stripe API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a balance */
export type StripeV1BalanceGetConfig = {
	resource: 'balance';
	operation: 'get';
};

/** Create a charge */
export type StripeV1ChargeCreateConfig = {
	resource: 'charge';
	operation: 'create';
/**
 * ID of the customer to be associated with this charge
 * @displayOptions.show { resource: ["charge"], operation: ["create"] }
 */
		customerId: string | Expression<string>;
/**
 * Amount in cents to be collected for this charge, e.g. enter &lt;code&gt;100&lt;/code&gt; for $1.00
 * @displayOptions.show { resource: ["charge"], operation: ["create"] }
 * @default 0
 */
		amount: number | Expression<number>;
/**
 * Three-letter ISO currency code, e.g. &lt;code&gt;USD&lt;/code&gt; or &lt;code&gt;EUR&lt;/code&gt;. It must be a &lt;a href="https://stripe.com/docs/currencies"&gt;Stripe-supported currency&lt;/a&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["charge"], operation: ["create"] }
 */
		currency: string | Expression<string>;
/**
 * ID of the customer's payment source to be charged
 * @displayOptions.show { resource: ["charge"], operation: ["create"] }
 */
		source: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a balance */
export type StripeV1ChargeGetConfig = {
	resource: 'charge';
	operation: 'get';
/**
 * ID of the charge to retrieve
 * @displayOptions.show { resource: ["charge"], operation: ["get"] }
 */
		chargeId: string | Expression<string>;
};

/** Get many charges */
export type StripeV1ChargeGetAllConfig = {
	resource: 'charge';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["charge"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["charge"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a charge */
export type StripeV1ChargeUpdateConfig = {
	resource: 'charge';
	operation: 'update';
/**
 * ID of the charge to update
 * @displayOptions.show { resource: ["charge"], operation: ["update"] }
 */
		chargeId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a charge */
export type StripeV1CouponCreateConfig = {
	resource: 'coupon';
	operation: 'create';
/**
 * How long the discount will be in effect
 * @displayOptions.show { resource: ["coupon"], operation: ["create"] }
 * @default once
 */
		duration: 'forever' | 'once' | Expression<string>;
/**
 * Whether the coupon discount is a percentage or a fixed amount
 * @displayOptions.show { resource: ["coupon"], operation: ["create"] }
 * @default percent
 */
		type: 'fixedAmount' | 'percent' | Expression<string>;
/**
 * Amount in cents to subtract from an invoice total, e.g. enter &lt;code&gt;100&lt;/code&gt; for $1.00
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], type: ["fixedAmount"] }
 * @default 0
 */
		amountOff: number | Expression<number>;
/**
 * Three-letter ISO currency code, e.g. &lt;code&gt;USD&lt;/code&gt; or &lt;code&gt;EUR&lt;/code&gt;. It must be a &lt;a href="https://stripe.com/docs/currencies"&gt;Stripe-supported currency&lt;/a&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], type: ["fixedAmount"] }
 */
		currency: string | Expression<string>;
/**
 * Percentage to apply with the coupon
 * @displayOptions.show { resource: ["coupon"], operation: ["create"], type: ["percent"] }
 * @default 1
 */
		percentOff: number | Expression<number>;
};

/** Get many charges */
export type StripeV1CouponGetAllConfig = {
	resource: 'coupon';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["coupon"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["coupon"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a charge */
export type StripeV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
/**
 * Full name or business name of the customer to create
 * @displayOptions.show { resource: ["customer"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a customer */
export type StripeV1CustomerDeleteConfig = {
	resource: 'customer';
	operation: 'delete';
/**
 * ID of the customer to delete
 * @displayOptions.show { resource: ["customer"], operation: ["delete"] }
 */
		customerId: string | Expression<string>;
};

/** Get a balance */
export type StripeV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
/**
 * ID of the customer to retrieve
 * @displayOptions.show { resource: ["customer"], operation: ["get"] }
 */
		customerId: string | Expression<string>;
};

/** Get many charges */
export type StripeV1CustomerGetAllConfig = {
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

/** Update a charge */
export type StripeV1CustomerUpdateConfig = {
	resource: 'customer';
	operation: 'update';
/**
 * ID of the customer to update
 * @displayOptions.show { resource: ["customer"], operation: ["update"] }
 */
		customerId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add a customer card */
export type StripeV1CustomerCardAddConfig = {
	resource: 'customerCard';
	operation: 'add';
/**
 * ID of the customer to be associated with this card
 * @displayOptions.show { resource: ["customerCard"], operation: ["add"] }
 */
		customerId: string | Expression<string>;
/**
 * Token representing sensitive card information
 * @displayOptions.show { resource: ["customerCard"], operation: ["add"] }
 */
		token: string | Expression<string>;
};

/** Get a balance */
export type StripeV1CustomerCardGetConfig = {
	resource: 'customerCard';
	operation: 'get';
/**
 * ID of the customer whose card to retrieve
 * @displayOptions.show { resource: ["customerCard"], operation: ["get"] }
 */
		customerId: string | Expression<string>;
/**
 * ID of the source to retrieve
 * @displayOptions.show { resource: ["customerCard"], operation: ["get"] }
 */
		sourceId: string | Expression<string>;
};

/** Remove a customer card */
export type StripeV1CustomerCardRemoveConfig = {
	resource: 'customerCard';
	operation: 'remove';
/**
 * ID of the customer whose card to remove
 * @displayOptions.show { resource: ["customerCard"], operation: ["remove"] }
 */
		customerId: string | Expression<string>;
/**
 * ID of the card to remove
 * @displayOptions.show { resource: ["customerCard"], operation: ["remove"] }
 */
		cardId: string | Expression<string>;
};

/** Create a charge */
export type StripeV1MeterEventCreateConfig = {
	resource: 'meterEvent';
	operation: 'create';
/**
 * The name of the meter event. Corresponds with the event_name field on a meter.
 * @displayOptions.show { resource: ["meterEvent"], operation: ["create"] }
 */
		eventName: string | Expression<string>;
/**
 * The Stripe customer ID associated with this meter event
 * @displayOptions.show { resource: ["meterEvent"], operation: ["create"] }
 */
		customerId: string | Expression<string>;
/**
 * The value of the meter event. Must be an integer. Can be positive or negative.
 * @displayOptions.show { resource: ["meterEvent"], operation: ["create"] }
 * @default 1
 */
		value: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Create a charge */
export type StripeV1SourceCreateConfig = {
	resource: 'source';
	operation: 'create';
/**
 * ID of the customer to attach the source to
 * @displayOptions.show { resource: ["source"], operation: ["create"] }
 */
		customerId: string | Expression<string>;
/**
 * Type of source (payment instrument) to create
 * @displayOptions.show { resource: ["source"], operation: ["create"] }
 * @default wechat
 */
		type: 'wechat' | Expression<string>;
/**
 * Amount in cents to be collected for this charge, e.g. enter &lt;code&gt;100&lt;/code&gt; for $1.00
 * @displayOptions.show { resource: ["source"], operation: ["create"] }
 * @default 0
 */
		amount?: number | Expression<number>;
/**
 * Three-letter ISO currency code, e.g. &lt;code&gt;USD&lt;/code&gt; or &lt;code&gt;EUR&lt;/code&gt;. It must be a &lt;a href="https://stripe.com/docs/currencies"&gt;Stripe-supported currency&lt;/a&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["source"], operation: ["create"] }
 */
		currency?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a customer */
export type StripeV1SourceDeleteConfig = {
	resource: 'source';
	operation: 'delete';
/**
 * ID of the customer whose source to delete
 * @displayOptions.show { resource: ["source"], operation: ["delete"] }
 */
		customerId: string | Expression<string>;
/**
 * ID of the source to delete
 * @displayOptions.show { resource: ["source"], operation: ["delete"] }
 */
		sourceId: string | Expression<string>;
};

/** Get a balance */
export type StripeV1SourceGetConfig = {
	resource: 'source';
	operation: 'get';
/**
 * ID of the source to retrieve
 * @displayOptions.show { resource: ["source"], operation: ["get"] }
 */
		sourceId: string | Expression<string>;
};

/** Create a charge */
export type StripeV1TokenCreateConfig = {
	resource: 'token';
	operation: 'create';
/**
 * Type of token to create
 * @displayOptions.show { resource: ["token"], operation: ["create"] }
 * @default cardToken
 */
		type: 'cardToken' | Expression<string>;
	number?: string | Expression<string>;
/**
 * Security code printed on the back of the card
 * @displayOptions.show { resource: ["token"], operation: ["create"], type: ["cardToken"] }
 */
		cvc?: string | Expression<string>;
/**
 * Number of the month when the card will expire
 * @displayOptions.show { resource: ["token"], operation: ["create"], type: ["cardToken"] }
 */
		expirationMonth?: string | Expression<string>;
/**
 * Year when the card will expire
 * @displayOptions.show { resource: ["token"], operation: ["create"], type: ["cardToken"] }
 */
		expirationYear?: string | Expression<string>;
};

export type StripeV1Params =
	| StripeV1BalanceGetConfig
	| StripeV1ChargeCreateConfig
	| StripeV1ChargeGetConfig
	| StripeV1ChargeGetAllConfig
	| StripeV1ChargeUpdateConfig
	| StripeV1CouponCreateConfig
	| StripeV1CouponGetAllConfig
	| StripeV1CustomerCreateConfig
	| StripeV1CustomerDeleteConfig
	| StripeV1CustomerGetConfig
	| StripeV1CustomerGetAllConfig
	| StripeV1CustomerUpdateConfig
	| StripeV1CustomerCardAddConfig
	| StripeV1CustomerCardGetConfig
	| StripeV1CustomerCardRemoveConfig
	| StripeV1MeterEventCreateConfig
	| StripeV1SourceCreateConfig
	| StripeV1SourceDeleteConfig
	| StripeV1SourceGetConfig
	| StripeV1TokenCreateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface StripeV1Credentials {
	stripeApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type StripeV1Node = {
	type: 'n8n-nodes-base.stripe';
	version: 1;
	config: NodeConfig<StripeV1Params>;
	credentials?: StripeV1Credentials;
};