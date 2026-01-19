/**
 * Invoice Ninja Trigger Node - Version 2
 * Starts the workflow when Invoice Ninja events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface InvoiceNinjaTriggerV2Config {
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	event: 'create_client' | 'create_invoice' | 'create_payment' | 'create_quote' | 'create_vendor' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface InvoiceNinjaTriggerV2Credentials {
	invoiceNinjaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface InvoiceNinjaTriggerV2NodeBase {
	type: 'n8n-nodes-base.invoiceNinjaTrigger';
	version: 2;
	credentials?: InvoiceNinjaTriggerV2Credentials;
	isTrigger: true;
}

export type InvoiceNinjaTriggerV2Node = InvoiceNinjaTriggerV2NodeBase & {
	config: NodeConfig<InvoiceNinjaTriggerV2Config>;
};

export type InvoiceNinjaTriggerV2Node = InvoiceNinjaTriggerV2Node;