/**
 * Xero Node Types
 *
 * Consume Xero API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/xero/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a contact */
export type XeroV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 */
	organizationId: string | Expression<string>;
	/**
	 * Full name of contact/organisation
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a contact */
export type XeroV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
	 */
	organizationId: string | Expression<string>;
	contactId: string | Expression<string>;
};

/** Get many contacts */
export type XeroV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
	 */
	organizationId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a contact */
export type XeroV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
	 */
	organizationId: string | Expression<string>;
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a contact */
export type XeroV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
	 */
	organizationId: string | Expression<string>;
	/**
	 * Invoice Type
	 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
	 */
	type: 'ACCPAY' | 'ACCREC' | Expression<string>;
	contactId: string | Expression<string>;
	/**
	 * Line item data
	 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
	 * @default {}
	 */
	lineItemsUi?: {
		lineItemsValues?: Array<{
			/** A line item with just a description
			 */
			description?: string | Expression<string>;
			/** LineItem Quantity
			 * @default 1
			 */
			quantity?: number | Expression<number>;
			/** Lineitem unit amount. By default, unit amount will be rounded to two decimal places.
			 */
			unitAmount?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			itemCode?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			accountCode?: string | Expression<string>;
			/** Tax Type
			 */
			taxType?: 'INPUT' | 'NONE' | 'OUTPUT' | 'GSTONIMPORTS' | Expression<string>;
			/** The tax amount is auto calculated as a percentage of the line amount based on the tax rate
			 */
			taxAmount?: string | Expression<string>;
			/** The line amount reflects the discounted price if a DiscountRate has been used
			 */
			lineAmount?: string | Expression<string>;
			/** Percentage discount or discount amount being applied to a line item. Only supported on ACCREC invoices - ACCPAY invoices and credit notes in Xero do not support discounts.
			 */
			discountRate?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Get a contact */
export type XeroV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["invoice"], operation: ["get"] }
	 */
	organizationId: string | Expression<string>;
	invoiceId: string | Expression<string>;
};

/** Get many contacts */
export type XeroV1InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"] }
	 */
	organizationId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a contact */
export type XeroV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["invoice"], operation: ["update"] }
	 */
	organizationId: string | Expression<string>;
	invoiceId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type XeroV1Params =
	| XeroV1ContactCreateConfig
	| XeroV1ContactGetConfig
	| XeroV1ContactGetAllConfig
	| XeroV1ContactUpdateConfig
	| XeroV1InvoiceCreateConfig
	| XeroV1InvoiceGetConfig
	| XeroV1InvoiceGetAllConfig
	| XeroV1InvoiceUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface XeroV1Credentials {
	xeroOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type XeroV1Node = {
	type: 'n8n-nodes-base.xero';
	version: 1;
	config: NodeConfig<XeroV1Params>;
	credentials?: XeroV1Credentials;
};

export type XeroNode = XeroV1Node;
