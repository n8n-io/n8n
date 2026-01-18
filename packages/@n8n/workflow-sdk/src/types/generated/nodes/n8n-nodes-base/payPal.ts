/**
 * PayPal Node Types
 *
 * Consume PayPal API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/paypal/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a batch payout */
export type PayPalV1PayoutCreateConfig = {
	resource: 'payout';
	operation: 'create';
	/**
	 * A sender-specified ID number. Tracks the payout in an accounting system.
	 */
	senderBatchId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	itemsUi?: Record<string, unknown>;
	/**
	 * An array of individual payout items
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
	 */
	payoutBatchId: string | Expression<string>;
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

/** Cancels an unclaimed payout item */
export type PayPalV1PayoutItemCancelConfig = {
	resource: 'payoutItem';
	operation: 'cancel';
	/**
	 * The ID of the payout item to cancel
	 */
	payoutItemId: string | Expression<string>;
};

/** Show batch payout details */
export type PayPalV1PayoutItemGetConfig = {
	resource: 'payoutItem';
	operation: 'get';
	/**
	 * The ID of the payout item for which to show details
	 */
	payoutItemId: string | Expression<string>;
};

export type PayPalV1Params =
	| PayPalV1PayoutCreateConfig
	| PayPalV1PayoutGetConfig
	| PayPalV1PayoutItemCancelConfig
	| PayPalV1PayoutItemGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PayPalV1Credentials {
	payPalApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PayPalNode = {
	type: 'n8n-nodes-base.payPal';
	version: 1;
	config: NodeConfig<PayPalV1Params>;
	credentials?: PayPalV1Credentials;
};
