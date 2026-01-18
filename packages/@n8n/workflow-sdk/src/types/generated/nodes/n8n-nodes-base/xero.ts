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
	 */
	organizationId: string | Expression<string>;
	/**
	 * Full name of contact/organisation
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
	 */
	organizationId: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Update a contact */
export type XeroV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	organizationId: string | Expression<string>;
	/**
	 * Invoice Type
	 */
	type: 'ACCPAY' | 'ACCREC' | Expression<string>;
	contactId: string | Expression<string>;
	/**
	 * Line item data
	 * @default {}
	 */
	lineItemsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Get a contact */
export type XeroV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	organizationId: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Update a contact */
export type XeroV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
// Node Type
// ===========================================================================

export type XeroNode = {
	type: 'n8n-nodes-base.xero';
	version: 1;
	config: NodeConfig<XeroV1Params>;
	credentials?: XeroV1Credentials;
};
