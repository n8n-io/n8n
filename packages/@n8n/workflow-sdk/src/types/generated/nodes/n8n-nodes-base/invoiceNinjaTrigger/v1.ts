/**
 * Invoice Ninja Trigger Node - Version 1
 * Starts the workflow when Invoice Ninja events occur
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
// Node Types
// ===========================================================================

interface InvoiceNinjaTriggerV1NodeBase {
	type: 'n8n-nodes-base.invoiceNinjaTrigger';
	version: 1;
	credentials?: InvoiceNinjaTriggerV1Credentials;
	isTrigger: true;
}

export type InvoiceNinjaTriggerV1ParamsNode = InvoiceNinjaTriggerV1NodeBase & {
	config: NodeConfig<InvoiceNinjaTriggerV1Params>;
};

export type InvoiceNinjaTriggerV1Node = InvoiceNinjaTriggerV1ParamsNode;