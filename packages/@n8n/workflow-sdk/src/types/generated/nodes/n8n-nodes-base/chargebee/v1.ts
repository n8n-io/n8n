/**
 * Chargebee Node - Version 1
 * Retrieve data from Chargebee API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a customer */
export type ChargebeeV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
/**
 * Properties to set on the new user
 * @displayOptions.show { operation: ["create"], resource: ["customer"] }
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
 * @displayOptions.show { operation: ["list"], resource: ["invoice"] }
 * @default 10
 */
		maxResults?: number | Expression<number>;
/**
 * Filter for invoices
 * @displayOptions.show { operation: ["list"], resource: ["invoice"] }
 * @default {}
 */
		filters?: {
		date?: Array<{
			/** Operation to decide where the data should be mapped to
			 * @default after
			 */
			operation?: 'is' | 'is_not' | 'after' | 'before' | Expression<string>;
			/** Query date
			 */
			value?: string | Expression<string>;
		}>;
		total?: Array<{
			/** Operation to decide where the data should be mapped to
			 * @default gt
			 */
			operation?: 'gte' | 'gt' | 'is' | 'is_not' | 'lte' | 'lt' | Expression<string>;
			/** Query amount
			 * @default 0
			 */
			value?: number | Expression<number>;
		}>;
	};
};

/** Get URL for the invoice PDF */
export type ChargebeeV1InvoicePdfUrlConfig = {
	resource: 'invoice';
	operation: 'pdfUrl';
/**
 * The ID of the invoice to get
 * @displayOptions.show { operation: ["pdfUrl"], resource: ["invoice"] }
 */
		invoiceId: string | Expression<string>;
};

/** Cancel a subscription */
export type ChargebeeV1SubscriptionCancelConfig = {
	resource: 'subscription';
	operation: 'cancel';
/**
 * The ID of the subscription to cancel
 * @displayOptions.show { operation: ["cancel"], resource: ["subscription"] }
 */
		subscriptionId: string | Expression<string>;
/**
 * Whether it will not cancel it directly in will instead schedule the cancelation for the end of the term
 * @displayOptions.show { operation: ["cancel"], resource: ["subscription"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["subscription"] }
 */
		subscriptionId: string | Expression<string>;
};

export type ChargebeeV1Params =
	| ChargebeeV1CustomerCreateConfig
	| ChargebeeV1InvoiceListConfig
	| ChargebeeV1InvoicePdfUrlConfig
	| ChargebeeV1SubscriptionCancelConfig
	| ChargebeeV1SubscriptionDeleteConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ChargebeeV1Credentials {
	chargebeeApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ChargebeeV1Node = {
	type: 'n8n-nodes-base.chargebee';
	version: 1;
	config: NodeConfig<ChargebeeV1Params>;
	credentials?: ChargebeeV1Credentials;
};