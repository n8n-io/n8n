/**
 * QuickBooks Online Node - Version 1
 * Consume the QuickBooks Online API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type QuickbooksV1BillCreateConfig = {
	resource: 'bill';
	operation: 'create';
/**
 * The ID of the vendor who the bill is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["bill"], operation: ["create"] }
 * @default []
 */
		VendorRef: string | Expression<string>;
/**
 * Individual line item of a transaction
 * @displayOptions.show { resource: ["bill"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["bill"], operation: ["delete"] }
 */
		billId: string | Expression<string>;
};

export type QuickbooksV1BillGetConfig = {
	resource: 'bill';
	operation: 'get';
/**
 * The ID of the bill to retrieve
 * @displayOptions.show { resource: ["bill"], operation: ["get"] }
 */
		billId: string | Expression<string>;
};

export type QuickbooksV1BillGetAllConfig = {
	resource: 'bill';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["bill"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["bill"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["bill"], operation: ["update"] }
 */
		billId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
/**
 * The display name of the customer to create
 * @displayOptions.show { resource: ["customer"], operation: ["create"] }
 */
		displayName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
/**
 * The ID of the customer to retrieve
 * @displayOptions.show { resource: ["customer"], operation: ["get"] }
 */
		customerId: string | Expression<string>;
};

export type QuickbooksV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["customer"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["customer"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["customer"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["employee"], operation: ["get"] }
 */
		employeeId: string | Expression<string>;
};

export type QuickbooksV1EmployeeGetAllConfig = {
	resource: 'employee';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["employee"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["employee"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["employee"], operation: ["update"] }
 */
		employeeId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1EstimateCreateConfig = {
	resource: 'estimate';
	operation: 'create';
/**
 * The ID of the customer who the estimate is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["estimate"], operation: ["create"] }
 * @default []
 */
		CustomerRef: string | Expression<string>;
/**
 * Individual line item of a transaction
 * @displayOptions.show { resource: ["estimate"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["estimate"], operation: ["delete"] }
 */
		estimateId: string | Expression<string>;
};

export type QuickbooksV1EstimateGetConfig = {
	resource: 'estimate';
	operation: 'get';
/**
 * The ID of the estimate to retrieve
 * @displayOptions.show { resource: ["estimate"], operation: ["get"] }
 */
		estimateId: string | Expression<string>;
/**
 * Whether to download the estimate as a PDF file
 * @displayOptions.show { resource: ["estimate"], operation: ["get"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
/**
 * Name of the file that will be downloaded
 * @displayOptions.show { resource: ["estimate"], operation: ["get"], download: [true] }
 */
		fileName: string | Expression<string>;
};

export type QuickbooksV1EstimateGetAllConfig = {
	resource: 'estimate';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["estimate"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["estimate"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["estimate"], operation: ["send"] }
 */
		estimateId: string | Expression<string>;
/**
 * The email of the recipient of the estimate
 * @displayOptions.show { resource: ["estimate"], operation: ["send"] }
 */
		email: string | Expression<string>;
};

export type QuickbooksV1EstimateUpdateConfig = {
	resource: 'estimate';
	operation: 'update';
/**
 * The ID of the estimate to update
 * @displayOptions.show { resource: ["estimate"], operation: ["update"] }
 */
		estimateId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
/**
 * The ID of the customer who the invoice is for. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
 * @default []
 */
		CustomerRef: string | Expression<string>;
/**
 * Individual line item of a transaction
 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["invoice"], operation: ["delete"] }
 */
		invoiceId: string | Expression<string>;
};

export type QuickbooksV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
/**
 * The ID of the invoice to retrieve
 * @displayOptions.show { resource: ["invoice"], operation: ["get"] }
 */
		invoiceId: string | Expression<string>;
/**
 * Whether to download the invoice as a PDF file
 * @displayOptions.show { resource: ["invoice"], operation: ["get"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
/**
 * Name of the file that will be downloaded
 * @displayOptions.show { resource: ["invoice"], operation: ["get"], download: [true] }
 */
		fileName: string | Expression<string>;
};

export type QuickbooksV1InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["invoice"], operation: ["send"] }
 */
		invoiceId: string | Expression<string>;
/**
 * The email of the recipient of the invoice
 * @displayOptions.show { resource: ["invoice"], operation: ["send"] }
 */
		email: string | Expression<string>;
};

export type QuickbooksV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
/**
 * The ID of the invoice to update
 * @displayOptions.show { resource: ["invoice"], operation: ["update"] }
 */
		invoiceId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1InvoiceVoidConfig = {
	resource: 'invoice';
	operation: 'void';
/**
 * The ID of the invoice to void
 * @displayOptions.show { resource: ["invoice"], operation: ["void"] }
 */
		invoiceId: string | Expression<string>;
};

export type QuickbooksV1ItemGetConfig = {
	resource: 'item';
	operation: 'get';
/**
 * The ID of the item to retrieve
 * @displayOptions.show { resource: ["item"], operation: ["get"] }
 */
		itemId: string | Expression<string>;
};

export type QuickbooksV1ItemGetAllConfig = {
	resource: 'item';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["item"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["item"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["payment"], operation: ["create"] }
 * @default []
 */
		CustomerRef: string | Expression<string>;
/**
 * Total amount of the transaction
 * @displayOptions.show { resource: ["payment"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["payment"], operation: ["delete"] }
 */
		paymentId: string | Expression<string>;
};

export type QuickbooksV1PaymentGetConfig = {
	resource: 'payment';
	operation: 'get';
/**
 * The ID of the payment to retrieve
 * @displayOptions.show { resource: ["payment"], operation: ["get"] }
 */
		paymentId: string | Expression<string>;
/**
 * Whether to download estimate as PDF file
 * @displayOptions.show { resource: ["payment"], operation: ["get"] }
 * @default false
 */
		download: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
/**
 * Name of the file that will be downloaded
 * @displayOptions.show { resource: ["payment"], operation: ["get"], download: [true] }
 */
		fileName: string | Expression<string>;
};

export type QuickbooksV1PaymentGetAllConfig = {
	resource: 'payment';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["payment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["payment"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["payment"], operation: ["send"] }
 */
		paymentId: string | Expression<string>;
/**
 * The email of the recipient of the payment
 * @displayOptions.show { resource: ["payment"], operation: ["send"] }
 */
		email: string | Expression<string>;
};

export type QuickbooksV1PaymentUpdateConfig = {
	resource: 'payment';
	operation: 'update';
/**
 * The ID of the payment to update
 * @displayOptions.show { resource: ["payment"], operation: ["update"] }
 */
		paymentId: string | Expression<string>;
	updateFields: Record<string, unknown>;
};

export type QuickbooksV1PaymentVoidConfig = {
	resource: 'payment';
	operation: 'void';
/**
 * The ID of the payment to void
 * @displayOptions.show { resource: ["payment"], operation: ["void"] }
 */
		paymentId: string | Expression<string>;
};

export type QuickbooksV1PurchaseGetConfig = {
	resource: 'purchase';
	operation: 'get';
/**
 * The ID of the purchase to retrieve
 * @displayOptions.show { resource: ["purchase"], operation: ["get"] }
 */
		purchaseId: string | Expression<string>;
};

export type QuickbooksV1PurchaseGetAllConfig = {
	resource: 'purchase';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["purchase"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["purchase"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["transaction"], operation: ["getReport"] }
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
 * @displayOptions.show { resource: ["vendor"], operation: ["create"] }
 */
		displayName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type QuickbooksV1VendorGetConfig = {
	resource: 'vendor';
	operation: 'get';
/**
 * The ID of the vendor to retrieve
 * @displayOptions.show { resource: ["vendor"], operation: ["get"] }
 */
		vendorId: string | Expression<string>;
};

export type QuickbooksV1VendorGetAllConfig = {
	resource: 'vendor';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["vendor"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["vendor"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["vendor"], operation: ["update"] }
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
	| QuickbooksV1VendorUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface QuickbooksV1Credentials {
	quickBooksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type QuickbooksV1Node = {
	type: 'n8n-nodes-base.quickbooks';
	version: 1;
	config: NodeConfig<QuickbooksV1Params>;
	credentials?: QuickbooksV1Credentials;
};