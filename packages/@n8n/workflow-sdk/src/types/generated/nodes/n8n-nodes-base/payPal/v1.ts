/**
 * PayPal Node - Version 1
 * Consume PayPal API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a batch payout */
export type PayPalV1PayoutCreateConfig = {
	resource: 'payout';
	operation: 'create';
/**
 * A sender-specified ID number. Tracks the payout in an accounting system.
 * @displayOptions.show { resource: ["payout"], operation: ["create"] }
 */
		senderBatchId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	itemsUi?: {
		itemsValues?: Array<{
			/** The ID type that identifies the recipient of the payment
			 * @default email
			 */
			recipientType?: 'phone' | 'email' | 'paypalId' | Expression<string>;
			/** The receiver of the payment. Corresponds to the recipient_type value in the request. Max length: 127 characters.
			 */
			receiverValue?: string | Expression<string>;
			/** Currency
			 * @default USD
			 */
			currency?: 'AUD' | 'BRL' | 'CAD' | 'CZK' | 'DKK' | 'EUR' | 'USD' | Expression<string>;
			/** The value, which might be
			 */
			amount?: string | Expression<string>;
			/** The sender-specified note for notifications. Supports up to 4000 ASCII characters and 1000 non-ASCII characters.
			 */
			note?: string | Expression<string>;
			/** The sender-specified ID number. Tracks the payout in an accounting system.
			 */
			senderItemId?: string | Expression<string>;
			/** Recipient Wallet
			 * @default paypal
			 */
			recipientWallet?: 'paypal' | 'venmo' | Expression<string>;
		}>;
	};
/**
 * An array of individual payout items
 * @displayOptions.show { resource: ["payout"], operation: ["create"], jsonParameters: [true] }
 */
		itemsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Show batch payout details */
export type PayPalV1PayoutGetConfig = {
	resource: 'payout';
	operation: 'get';
/**
 * The ID of the payout for which to show details
 * @displayOptions.show { resource: ["payout"], operation: ["get"] }
 */
		payoutBatchId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["payout"], operation: ["get"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["payout"], operation: ["get"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Cancels an unclaimed payout item */
export type PayPalV1PayoutItemCancelConfig = {
	resource: 'payoutItem';
	operation: 'cancel';
/**
 * The ID of the payout item to cancel
 * @displayOptions.show { resource: ["payoutItem"], operation: ["cancel"] }
 */
		payoutItemId: string | Expression<string>;
};

/** Show batch payout details */
export type PayPalV1PayoutItemGetConfig = {
	resource: 'payoutItem';
	operation: 'get';
/**
 * The ID of the payout item for which to show details
 * @displayOptions.show { resource: ["payoutItem"], operation: ["get"] }
 */
		payoutItemId: string | Expression<string>;
};

export type PayPalV1Params =
	| PayPalV1PayoutCreateConfig
	| PayPalV1PayoutGetConfig
	| PayPalV1PayoutItemCancelConfig
	| PayPalV1PayoutItemGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PayPalV1Credentials {
	payPalApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PayPalV1Node = {
	type: 'n8n-nodes-base.payPal';
	version: 1;
	config: NodeConfig<PayPalV1Params>;
	credentials?: PayPalV1Credentials;
};