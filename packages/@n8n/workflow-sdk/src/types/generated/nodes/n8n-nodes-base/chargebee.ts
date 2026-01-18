/**
 * Chargebee Node Types
 *
 * Retrieve data from Chargebee API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/chargebee/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a customer */
export type ChargebeeV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
	/**
	 * Properties to set on the new user
	 * @default {}
	 */
	properties?: Record<string, unknown>;
};

/** Return the invoices */
export type ChargebeeV1InvoiceListConfig = {
	resource: 'invoice';
	operation: 'list';
	/**
	 * Max. amount of results to return(&lt; 100).
	 * @default 10
	 */
	maxResults?: number | Expression<number>;
	/**
	 * Filter for invoices
	 * @default {}
	 */
	filters?: Record<string, unknown>;
};

/** Get URL for the invoice PDF */
export type ChargebeeV1InvoicePdfUrlConfig = {
	resource: 'invoice';
	operation: 'pdfUrl';
	/**
	 * The ID of the invoice to get
	 */
	invoiceId: string | Expression<string>;
};

/** Cancel a subscription */
export type ChargebeeV1SubscriptionCancelConfig = {
	resource: 'subscription';
	operation: 'cancel';
	/**
	 * The ID of the subscription to cancel
	 */
	subscriptionId: string | Expression<string>;
	/**
	 * Whether it will not cancel it directly in will instead schedule the cancelation for the end of the term
	 * @default false
	 */
	endOfTerm?: boolean | Expression<boolean>;
};

/** Delete a subscription */
export type ChargebeeV1SubscriptionDeleteConfig = {
	resource: 'subscription';
	operation: 'delete';
	/**
	 * The ID of the subscription to delete
	 */
	subscriptionId: string | Expression<string>;
};

export type ChargebeeV1Params =
	| ChargebeeV1CustomerCreateConfig
	| ChargebeeV1InvoiceListConfig
	| ChargebeeV1InvoicePdfUrlConfig
	| ChargebeeV1SubscriptionCancelConfig
	| ChargebeeV1SubscriptionDeleteConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ChargebeeV1Credentials {
	chargebeeApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ChargebeeNode = {
	type: 'n8n-nodes-base.chargebee';
	version: 1;
	config: NodeConfig<ChargebeeV1Params>;
	credentials?: ChargebeeV1Credentials;
};
