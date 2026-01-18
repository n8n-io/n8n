/**
 * Invoice Ninja Trigger Node - Version 1
 * Starts the workflow when Invoice Ninja events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface InvoiceNinjaTriggerV1Params {
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	event: 'create_client' | 'create_invoice' | 'create_payment' | 'create_quote' | 'create_vendor' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface InvoiceNinjaTriggerV1Credentials {
	invoiceNinjaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type InvoiceNinjaTriggerV1Node = {
	type: 'n8n-nodes-base.invoiceNinjaTrigger';
	version: 1;
	config: NodeConfig<InvoiceNinjaTriggerV1Params>;
	credentials?: InvoiceNinjaTriggerV1Credentials;
	isTrigger: true;
};