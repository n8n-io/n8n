/**
 * QuickBooks Online Node Types
 *
 * Consume the QuickBooks Online API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/quickbooks/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type QuickbooksV1BillCreateConfig = {
	resource: 'bill';
	operation: 'create';
	/**
	 * The ID of the vendor who the bill is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	VendorRef: string | Expression<string>;
	/**
	 * Individual line item of a transaction
	 * @default {}
	 */
	Line?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1BillDeleteConfig = {
	resource: 'bill';
	operation: 'delete';
	/**
	 * The ID of the bill to delete
	 */
	billId: string | Expression<string>;
};

export type QuickbooksV1BillGetConfig = {
	resource: 'bill';
	operation: 'get';
	/**
	 * The ID of the bill to retrieve
	 */
	billId: string | Expression<string>;
};

export type QuickbooksV1BillGetAllConfig = {
	resource: 'bill';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1BillUpdateConfig = {
	resource: 'bill';
	operation: 'update';
	/**
	 * The ID of the bill to update
	 */
	billId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
	/**
	 * The display name of the customer to create
	 */
	displayName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
	/**
	 * The ID of the customer to retrieve
	 */
	customerId: string | Expression<string>;
};

export type QuickbooksV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1CustomerUpdateConfig = {
	resource: 'customer';
	operation: 'update';
	/**
	 * The ID of the customer to update
	 */
	customerId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1EmployeeCreateConfig = {
	resource: 'employee';
	operation: 'create';
	FamilyName?: string | Expression<string>;
	GivenName?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1EmployeeGetConfig = {
	resource: 'employee';
	operation: 'get';
	/**
	 * The ID of the employee to retrieve
	 */
	employeeId: string | Expression<string>;
};

export type QuickbooksV1EmployeeGetAllConfig = {
	resource: 'employee';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1EmployeeUpdateConfig = {
	resource: 'employee';
	operation: 'update';
	/**
	 * The ID of the employee to update
	 */
	employeeId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1EstimateCreateConfig = {
	resource: 'estimate';
	operation: 'create';
	/**
	 * The ID of the customer who the estimate is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	CustomerRef: string | Expression<string>;
	/**
	 * Individual line item of a transaction
	 * @default {}
	 */
	Line?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1EstimateDeleteConfig = {
	resource: 'estimate';
	operation: 'delete';
	/**
	 * The ID of the estimate to delete
	 */
	estimateId: string | Expression<string>;
};

export type QuickbooksV1EstimateGetConfig = {
	resource: 'estimate';
	operation: 'get';
	/**
	 * The ID of the estimate to retrieve
	 */
	estimateId: string | Expression<string>;
	/**
	 * Whether to download the estimate as a PDF file
	 * @default false
	 */
	download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
	/**
	 * Name of the file that will be downloaded
	 */
	fileName: string | Expression<string>;
};

export type QuickbooksV1EstimateGetAllConfig = {
	resource: 'estimate';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1EstimateSendConfig = {
	resource: 'estimate';
	operation: 'send';
	/**
	 * The ID of the estimate to send
	 */
	estimateId: string | Expression<string>;
	/**
	 * The email of the recipient of the estimate
	 */
	email: string | Expression<string>;
};

export type QuickbooksV1EstimateUpdateConfig = {
	resource: 'estimate';
	operation: 'update';
	/**
	 * The ID of the estimate to update
	 */
	estimateId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
	/**
	 * The ID of the customer who the invoice is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	CustomerRef: string | Expression<string>;
	/**
	 * Individual line item of a transaction
	 * @default {}
	 */
	Line?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1InvoiceDeleteConfig = {
	resource: 'invoice';
	operation: 'delete';
	/**
	 * The ID of the invoice to delete
	 */
	invoiceId: string | Expression<string>;
};

export type QuickbooksV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
	/**
	 * The ID of the invoice to retrieve
	 */
	invoiceId: string | Expression<string>;
	/**
	 * Whether to download the invoice as a PDF file
	 * @default false
	 */
	download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
	/**
	 * Name of the file that will be downloaded
	 */
	fileName: string | Expression<string>;
};

export type QuickbooksV1InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1InvoiceSendConfig = {
	resource: 'invoice';
	operation: 'send';
	/**
	 * The ID of the invoice to send
	 */
	invoiceId: string | Expression<string>;
	/**
	 * The email of the recipient of the invoice
	 */
	email: string | Expression<string>;
};

export type QuickbooksV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
	/**
	 * The ID of the invoice to update
	 */
	invoiceId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1InvoiceVoidConfig = {
	resource: 'invoice';
	operation: 'void';
	/**
	 * The ID of the invoice to void
	 */
	invoiceId: string | Expression<string>;
};

export type QuickbooksV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
	/**
	 * The ID of the item to retrieve
	 */
	itemId: string | Expression<string>;
};

export type QuickbooksV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1PaymentCreateConfig = {
	resource: 'payment';
	operation: 'create';
	/**
	 * The ID of the customer who the payment is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	CustomerRef: string | Expression<string>;
	/**
	 * Total amount of the transaction
	 * @default 0
	 */
	TotalAmt?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1PaymentDeleteConfig = {
	resource: 'payment';
	operation: 'delete';
	/**
	 * The ID of the payment to delete
	 */
	paymentId: string | Expression<string>;
};

export type QuickbooksV1PaymentGetConfig = {
	resource: 'payment';
	operation: 'get';
	/**
	 * The ID of the payment to retrieve
	 */
	paymentId: string | Expression<string>;
	/**
	 * Whether to download estimate as PDF file
	 * @default false
	 */
	download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
	/**
	 * Name of the file that will be downloaded
	 */
	fileName: string | Expression<string>;
};

export type QuickbooksV1PaymentGetAllConfig = {
	resource: 'payment';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1PaymentSendConfig = {
	resource: 'payment';
	operation: 'send';
	/**
	 * The ID of the payment to send
	 */
	paymentId: string | Expression<string>;
	/**
	 * The email of the recipient of the payment
	 */
	email: string | Expression<string>;
};

export type QuickbooksV1PaymentUpdateConfig = {
	resource: 'payment';
	operation: 'update';
	/**
	 * The ID of the payment to update
	 */
	paymentId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1PaymentVoidConfig = {
	resource: 'payment';
	operation: 'void';
	/**
	 * The ID of the payment to void
	 */
	paymentId: string | Expression<string>;
};

export type QuickbooksV1PurchaseGetConfig = {
	resource: 'purchase';
	operation: 'get';
	/**
	 * The ID of the purchase to retrieve
	 */
	purchaseId: string | Expression<string>;
};

export type QuickbooksV1PurchaseGetAllConfig = {
	resource: 'purchase';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1TransactionGetReportConfig = {
	resource: 'transaction';
	operation: 'getReport';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1VendorCreateConfig = {
	resource: 'vendor';
	operation: 'create';
	/**
	 * The display name of the vendor to create
	 */
	displayName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1VendorGetConfig = {
	resource: 'vendor';
	operation: 'get';
	/**
	 * The ID of the vendor to retrieve
	 */
	vendorId: string | Expression<string>;
};

export type QuickbooksV1VendorGetAllConfig = {
	resource: 'vendor';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type QuickbooksV1VendorUpdateConfig = {
	resource: 'vendor';
	operation: 'update';
	/**
	 * The ID of the vendor to update
	 */
	vendorId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1Params =
	| QuickbooksV1BillCreateConfig
	| QuickbooksV1BillDeleteConfig
	| QuickbooksV1BillGetConfig
	| QuickbooksV1BillGetAllConfig
	| QuickbooksV1BillUpdateConfig
	| QuickbooksV1CustomerCreateConfig
	| QuickbooksV1CustomerGetConfig
	| QuickbooksV1CustomerGetAllConfig
	| QuickbooksV1CustomerUpdateConfig
	| QuickbooksV1EmployeeCreateConfig
	| QuickbooksV1EmployeeGetConfig
	| QuickbooksV1EmployeeGetAllConfig
	| QuickbooksV1EmployeeUpdateConfig
	| QuickbooksV1EstimateCreateConfig
	| QuickbooksV1EstimateDeleteConfig
	| QuickbooksV1EstimateGetConfig
	| QuickbooksV1EstimateGetAllConfig
	| QuickbooksV1EstimateSendConfig
	| QuickbooksV1EstimateUpdateConfig
	| QuickbooksV1InvoiceCreateConfig
	| QuickbooksV1InvoiceDeleteConfig
	| QuickbooksV1InvoiceGetConfig
	| QuickbooksV1InvoiceGetAllConfig
	| QuickbooksV1InvoiceSendConfig
	| QuickbooksV1InvoiceUpdateConfig
	| QuickbooksV1InvoiceVoidConfig
	| QuickbooksV1ItemGetConfig
	| QuickbooksV1ItemGetAllConfig
	| QuickbooksV1PaymentCreateConfig
	| QuickbooksV1PaymentDeleteConfig
	| QuickbooksV1PaymentGetConfig
	| QuickbooksV1PaymentGetAllConfig
	| QuickbooksV1PaymentSendConfig
	| QuickbooksV1PaymentUpdateConfig
	| QuickbooksV1PaymentVoidConfig
	| QuickbooksV1PurchaseGetConfig
	| QuickbooksV1PurchaseGetAllConfig
	| QuickbooksV1TransactionGetReportConfig
	| QuickbooksV1VendorCreateConfig
	| QuickbooksV1VendorGetConfig
	| QuickbooksV1VendorGetAllConfig
	| QuickbooksV1VendorUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface QuickbooksV1Credentials {
	quickBooksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type QuickbooksNode = {
	type: 'n8n-nodes-base.quickbooks';
	version: 1;
	config: NodeConfig<QuickbooksV1Params>;
	credentials?: QuickbooksV1Credentials;
};
