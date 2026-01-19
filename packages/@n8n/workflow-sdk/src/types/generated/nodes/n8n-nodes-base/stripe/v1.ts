/**
 * Stripe Node - Version 1
 * Consume the Stripe API
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


// ===========================================================================
// Output Types
// ===========================================================================

export type StripeV1BalanceGetOutput = {
	available?: Array<{
		amount?: number;
		currency?: string;
		source_types?: {
			card?: number;
		};
	}>;
	livemode?: boolean;
	object?: string;
	pending?: Array<{
		amount?: number;
		currency?: string;
		source_types?: {
			card?: number;
		};
	}>;
	refund_and_dispute_prefunding?: {
		available?: Array<{
			amount?: number;
			currency?: string;
		}>;
		pending?: Array<{
			amount?: number;
			currency?: string;
		}>;
	};
};

export type StripeV1ChargeGetOutput = {
	amount?: number;
	amount_captured?: number;
	amount_refunded?: number;
	application_fee?: null;
	application_fee_amount?: null;
	captured?: boolean;
	created?: number;
	currency?: string;
	destination?: null;
	dispute?: null;
	disputed?: boolean;
	failure_balance_transaction?: null;
	id?: string;
	livemode?: boolean;
	metadata?: {
		date_due?: string;
		erp_provider_dimension_id?: string;
		invoice_id?: string;
		period_end?: string;
		period_start?: string;
		reservation_id?: string;
		type?: string;
	};
	object?: string;
	on_behalf_of?: null;
	order?: null;
	outcome?: {
		network_status?: string;
		risk_level?: string;
		risk_score?: number;
		seller_message?: string;
		type?: string;
	};
	paid?: boolean;
	payment_intent?: string;
	payment_method?: string;
	payment_method_details?: {
		card?: {
			brand?: string;
			capture_before?: number;
			country?: string;
			exp_month?: number;
			exp_year?: number;
			extended_authorization?: {
				status?: string;
			};
			fingerprint?: string;
			funding?: string;
			incremental_authorization?: {
				status?: string;
			};
			installments?: null;
			last4?: string;
			mandate?: null;
			multicapture?: {
				status?: string;
			};
			network?: string;
			network_token?: {
				used?: boolean;
			};
			network_transaction_id?: string;
			overcapture?: {
				maximum_amount_capturable?: number;
				status?: string;
			};
			regulated_status?: string;
			three_d_secure?: null;
		};
		type?: string;
	};
	refunded?: boolean;
	refunds?: {
		data?: Array<{
			amount?: number;
			balance_transaction?: string;
			charge?: string;
			created?: number;
			currency?: string;
			destination_details?: {
				card?: {
					reference?: string;
					reference_status?: string;
					reference_type?: string;
					type?: string;
				};
				type?: string;
			};
			id?: string;
			object?: string;
			payment_intent?: string;
			reason?: null;
			source_transfer_reversal?: null;
			status?: string;
			transfer_reversal?: null;
		}>;
		has_more?: boolean;
		object?: string;
		total_count?: number;
		url?: string;
	};
	review?: null;
	shipping?: null;
	source?: null;
	source_transfer?: null;
	statement_descriptor?: null;
	statement_descriptor_suffix?: null;
	status?: string;
	transfer_data?: null;
	transfer_group?: null;
};

export type StripeV1ChargeGetAllOutput = {
	amount?: number;
	amount_captured?: number;
	amount_refunded?: number;
	application_fee?: null;
	captured?: boolean;
	created?: number;
	currency?: string;
	destination?: null;
	dispute?: null;
	disputed?: boolean;
	failure_balance_transaction?: null;
	id?: string;
	livemode?: boolean;
	object?: string;
	on_behalf_of?: null;
	order?: null;
	outcome?: {
		network_status?: string;
		risk_level?: string;
		seller_message?: string;
		type?: string;
	};
	paid?: boolean;
	payment_method_details?: {
		card?: {
			brand?: string;
			country?: string;
			exp_month?: number;
			exp_year?: number;
			extended_authorization?: {
				status?: string;
			};
			fingerprint?: string;
			funding?: string;
			incremental_authorization?: {
				status?: string;
			};
			installments?: null;
			last4?: string;
			mandate?: null;
			multicapture?: {
				status?: string;
			};
			network?: string;
			network_token?: {
				used?: boolean;
			};
			overcapture?: {
				maximum_amount_capturable?: number;
				status?: string;
			};
			regulated_status?: string;
		};
		type?: string;
	};
	refunded?: boolean;
	refunds?: {
		has_more?: boolean;
		object?: string;
		total_count?: number;
		url?: string;
	};
	review?: null;
	source_transfer?: null;
	status?: string;
	transfer_data?: null;
	transfer_group?: null;
};

export type StripeV1CustomerCreateOutput = {
	balance?: number;
	created?: number;
	currency?: null;
	default_source?: null;
	delinquent?: boolean;
	discount?: null;
	id?: string;
	invoice_prefix?: string;
	invoice_settings?: {
		custom_fields?: null;
		default_payment_method?: null;
		footer?: null;
		rendering_options?: null;
	};
	livemode?: boolean;
	next_invoice_sequence?: number;
	object?: string;
	tax_exempt?: string;
	test_clock?: null;
};

export type StripeV1CustomerGetOutput = {
	balance?: number;
	created?: number;
	delinquent?: boolean;
	id?: string;
	invoice_prefix?: string;
	invoice_settings?: {
		footer?: null;
	};
	livemode?: boolean;
	object?: string;
	preferred_locales?: Array<string>;
	tax_exempt?: string;
};

export type StripeV1CustomerGetAllOutput = {
	balance?: number;
	created?: number;
	delinquent?: boolean;
	id?: string;
	invoice_prefix?: string;
	invoice_settings?: {
		custom_fields?: null;
		footer?: null;
		rendering_options?: null;
	};
	livemode?: boolean;
	object?: string;
	preferred_locales?: Array<string>;
	tax_exempt?: string;
	test_clock?: null;
};

export type StripeV1CustomerUpdateOutput = {
	balance?: number;
	created?: number;
	delinquent?: boolean;
	discount?: null;
	id?: string;
	invoice_prefix?: string;
	invoice_settings?: {
		custom_fields?: null;
		footer?: null;
		rendering_options?: null;
	};
	livemode?: boolean;
	metadata?: {
		Telefone?: string;
	};
	next_invoice_sequence?: number;
	object?: string;
	preferred_locales?: Array<string>;
	tax_exempt?: string;
	test_clock?: null;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface StripeV1Credentials {
	stripeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface StripeV1NodeBase {
	type: 'n8n-nodes-base.stripe';
	version: 1;
	credentials?: StripeV1Credentials;
}

export type StripeV1BalanceGetNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1BalanceGetConfig>;
	output?: StripeV1BalanceGetOutput;
};

export type StripeV1ChargeCreateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1ChargeCreateConfig>;
};

export type StripeV1ChargeGetNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1ChargeGetConfig>;
	output?: StripeV1ChargeGetOutput;
};

export type StripeV1ChargeGetAllNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1ChargeGetAllConfig>;
	output?: StripeV1ChargeGetAllOutput;
};

export type StripeV1ChargeUpdateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1ChargeUpdateConfig>;
};

export type StripeV1CouponCreateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CouponCreateConfig>;
};

export type StripeV1CouponGetAllNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CouponGetAllConfig>;
};

export type StripeV1CustomerCreateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerCreateConfig>;
	output?: StripeV1CustomerCreateOutput;
};

export type StripeV1CustomerDeleteNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerDeleteConfig>;
};

export type StripeV1CustomerGetNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerGetConfig>;
	output?: StripeV1CustomerGetOutput;
};

export type StripeV1CustomerGetAllNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerGetAllConfig>;
	output?: StripeV1CustomerGetAllOutput;
};

export type StripeV1CustomerUpdateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerUpdateConfig>;
	output?: StripeV1CustomerUpdateOutput;
};

export type StripeV1CustomerCardAddNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerCardAddConfig>;
};

export type StripeV1CustomerCardGetNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerCardGetConfig>;
};

export type StripeV1CustomerCardRemoveNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1CustomerCardRemoveConfig>;
};

export type StripeV1MeterEventCreateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1MeterEventCreateConfig>;
};

export type StripeV1SourceCreateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1SourceCreateConfig>;
};

export type StripeV1SourceDeleteNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1SourceDeleteConfig>;
};

export type StripeV1SourceGetNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1SourceGetConfig>;
};

export type StripeV1TokenCreateNode = StripeV1NodeBase & {
	config: NodeConfig<StripeV1TokenCreateConfig>;
};

export type StripeV1Node =
	| StripeV1BalanceGetNode
	| StripeV1ChargeCreateNode
	| StripeV1ChargeGetNode
	| StripeV1ChargeGetAllNode
	| StripeV1ChargeUpdateNode
	| StripeV1CouponCreateNode
	| StripeV1CouponGetAllNode
	| StripeV1CustomerCreateNode
	| StripeV1CustomerDeleteNode
	| StripeV1CustomerGetNode
	| StripeV1CustomerGetAllNode
	| StripeV1CustomerUpdateNode
	| StripeV1CustomerCardAddNode
	| StripeV1CustomerCardGetNode
	| StripeV1CustomerCardRemoveNode
	| StripeV1MeterEventCreateNode
	| StripeV1SourceCreateNode
	| StripeV1SourceDeleteNode
	| StripeV1SourceGetNode
	| StripeV1TokenCreateNode
	;