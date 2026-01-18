/**
 * Invoice Ninja Trigger Node Types
 *
 * Starts the workflow when Invoice Ninja events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/invoiceninjatrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface InvoiceNinjaTriggerV2Params {
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	event:
		| 'create_client'
		| 'create_invoice'
		| 'create_payment'
		| 'create_quote'
		| 'create_vendor'
		| Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface InvoiceNinjaTriggerV2Credentials {
	invoiceNinjaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type InvoiceNinjaTriggerNode = {
	type: 'n8n-nodes-base.invoiceNinjaTrigger';
	version: 1 | 2;
	config: NodeConfig<InvoiceNinjaTriggerV2Params>;
	credentials?: InvoiceNinjaTriggerV2Credentials;
	isTrigger: true;
};
