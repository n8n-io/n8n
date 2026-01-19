/**
 * Zoho CRM Node - Version 1
 * Consume Zoho CRM API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an account */
export type ZohoCrmV1AccountCreateConfig = {
	resource: 'account';
	operation: 'create';
	accountName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1AccountUpsertConfig = {
	resource: 'account';
	operation: 'upsert';
/**
 * Name of the account. If a record with this account name exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["account"], operation: ["upsert"] }
 */
		accountName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1AccountDeleteConfig = {
	resource: 'account';
	operation: 'delete';
/**
 * ID of the account to delete. Can be found at the end of the URL.
 * @displayOptions.show { resource: ["account"], operation: ["delete"] }
 */
		accountId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
/**
 * ID of the account to retrieve. Can be found at the end of the URL.
 * @displayOptions.show { resource: ["account"], operation: ["get"] }
 */
		accountId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1AccountGetAllConfig = {
	resource: 'account';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["account"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["account"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1AccountUpdateConfig = {
	resource: 'account';
	operation: 'update';
/**
 * ID of the account to update. Can be found at the end of the URL.
 * @displayOptions.show { resource: ["account"], operation: ["update"] }
 */
		accountId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	lastName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	lastName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * ID of the contact to delete
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * ID of the contact to retrieve
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
/**
 * ID of the contact to update
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
 */
		contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
	dealName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["deal"], operation: ["create", "upsert"] }
 * @default []
 */
		stage: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1DealUpsertConfig = {
	resource: 'deal';
	operation: 'upsert';
/**
 * Name of the deal. If a record with this deal name exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["deal"], operation: ["upsert"] }
 */
		dealName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["deal"], operation: ["create", "upsert"] }
 * @default []
 */
		stage: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
/**
 * ID of the deal to delete
 * @displayOptions.show { resource: ["deal"], operation: ["delete"] }
 */
		dealId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
/**
 * ID of the deal to retrieve
 * @displayOptions.show { resource: ["deal"], operation: ["get"] }
 */
		dealId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
/**
 * ID of the deal to update
 * @displayOptions.show { resource: ["deal"], operation: ["update"] }
 */
		dealId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
/**
 * Subject or title of the invoice
 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
 */
		subject: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1InvoiceUpsertConfig = {
	resource: 'invoice';
	operation: 'upsert';
/**
 * Subject or title of the invoice. If a record with this subject exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["invoice"], operation: ["upsert"] }
 */
		subject: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1InvoiceDeleteConfig = {
	resource: 'invoice';
	operation: 'delete';
/**
 * ID of the invoice to delete
 * @displayOptions.show { resource: ["invoice"], operation: ["delete"] }
 */
		invoiceId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
/**
 * ID of the invoice to retrieve
 * @displayOptions.show { resource: ["invoice"], operation: ["get"] }
 */
		invoiceId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1InvoiceGetAllConfig = {
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
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
/**
 * ID of the invoice to update
 * @displayOptions.show { resource: ["invoice"], operation: ["update"] }
 */
		invoiceId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
/**
 * Company at which the lead works
 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
 */
		Company: string | Expression<string>;
	lastName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1LeadUpsertConfig = {
	resource: 'lead';
	operation: 'upsert';
/**
 * Company at which the lead works
 * @displayOptions.show { resource: ["lead"], operation: ["upsert"] }
 */
		Company: string | Expression<string>;
	lastName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
/**
 * ID of the lead to delete
 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
 */
		leadId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
/**
 * ID of the lead to retrieve
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		leadId: string | Expression<string>;
};

/** Get lead fields */
export type ZohoCrmV1LeadGetFieldsConfig = {
	resource: 'lead';
	operation: 'getFields';
};

/** Get many accounts */
export type ZohoCrmV1LeadGetAllConfig = {
	resource: 'lead';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1LeadUpdateConfig = {
	resource: 'lead';
	operation: 'update';
/**
 * ID of the lead to update
 * @displayOptions.show { resource: ["lead"], operation: ["update"] }
 */
		leadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1ProductCreateConfig = {
	resource: 'product';
	operation: 'create';
	productName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1ProductUpsertConfig = {
	resource: 'product';
	operation: 'upsert';
/**
 * Name of the product. If a record with this product name exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["product"], operation: ["upsert"] }
 */
		productName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1ProductDeleteConfig = {
	resource: 'product';
	operation: 'delete';
/**
 * ID of the product to delete
 * @displayOptions.show { resource: ["product"], operation: ["delete"] }
 */
		productId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1ProductGetConfig = {
	resource: 'product';
	operation: 'get';
/**
 * ID of the product to retrieve
 * @displayOptions.show { resource: ["product"], operation: ["get"] }
 */
		productId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1ProductGetAllConfig = {
	resource: 'product';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["product"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["product"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1ProductUpdateConfig = {
	resource: 'product';
	operation: 'update';
/**
 * ID of the product to update
 * @displayOptions.show { resource: ["product"], operation: ["update"] }
 */
		productId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1PurchaseOrderCreateConfig = {
	resource: 'purchaseOrder';
	operation: 'create';
/**
 * Subject or title of the purchase order
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["create"] }
 */
		subject: string | Expression<string>;
/**
 * ID of the vendor associated with the purchase order. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["create", "upsert"] }
 * @default []
 */
		vendorId?: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1PurchaseOrderUpsertConfig = {
	resource: 'purchaseOrder';
	operation: 'upsert';
/**
 * Subject or title of the purchase order. If a record with this subject exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["upsert"] }
 */
		subject: string | Expression<string>;
/**
 * ID of the vendor associated with the purchase order. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["create", "upsert"] }
 * @default []
 */
		vendorId?: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1PurchaseOrderDeleteConfig = {
	resource: 'purchaseOrder';
	operation: 'delete';
/**
 * ID of the purchase order to delete
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["delete"] }
 */
		purchaseOrderId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1PurchaseOrderGetConfig = {
	resource: 'purchaseOrder';
	operation: 'get';
/**
 * ID of the purchase order to retrieve
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["get"] }
 */
		purchaseOrderId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1PurchaseOrderGetAllConfig = {
	resource: 'purchaseOrder';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1PurchaseOrderUpdateConfig = {
	resource: 'purchaseOrder';
	operation: 'update';
/**
 * ID of the purchase order to update
 * @displayOptions.show { resource: ["purchaseOrder"], operation: ["update"] }
 */
		purchaseOrderId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1QuoteCreateConfig = {
	resource: 'quote';
	operation: 'create';
/**
 * Subject or title of the quote
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 */
		subject: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1QuoteUpsertConfig = {
	resource: 'quote';
	operation: 'upsert';
/**
 * Subject or title of the quote. If a record with this subject exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["quote"], operation: ["upsert"] }
 */
		subject: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1QuoteDeleteConfig = {
	resource: 'quote';
	operation: 'delete';
/**
 * ID of the quote to delete
 * @displayOptions.show { resource: ["quote"], operation: ["delete"] }
 */
		quoteId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1QuoteGetConfig = {
	resource: 'quote';
	operation: 'get';
/**
 * ID of the quote to retrieve
 * @displayOptions.show { resource: ["quote"], operation: ["get"] }
 */
		quoteId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1QuoteGetAllConfig = {
	resource: 'quote';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["quote"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["quote"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1QuoteUpdateConfig = {
	resource: 'quote';
	operation: 'update';
/**
 * ID of the quote to update
 * @displayOptions.show { resource: ["quote"], operation: ["update"] }
 */
		quoteId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1SalesOrderCreateConfig = {
	resource: 'salesOrder';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["salesOrder"], operation: ["create", "upsert"] }
 * @default []
 */
		accountId: string | Expression<string>;
/**
 * Subject or title of the sales order
 * @displayOptions.show { resource: ["salesOrder"], operation: ["create"] }
 */
		subject: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1SalesOrderUpsertConfig = {
	resource: 'salesOrder';
	operation: 'upsert';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["salesOrder"], operation: ["create", "upsert"] }
 * @default []
 */
		accountId: string | Expression<string>;
/**
 * Subject or title of the sales order. If a record with this subject exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["salesOrder"], operation: ["upsert"] }
 */
		subject: string | Expression<string>;
	Product_Details?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1SalesOrderDeleteConfig = {
	resource: 'salesOrder';
	operation: 'delete';
/**
 * ID of the sales order to delete
 * @displayOptions.show { resource: ["salesOrder"], operation: ["delete"] }
 */
		salesOrderId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1SalesOrderGetConfig = {
	resource: 'salesOrder';
	operation: 'get';
/**
 * ID of the sales order to retrieve
 * @displayOptions.show { resource: ["salesOrder"], operation: ["get"] }
 */
		salesOrderId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1SalesOrderGetAllConfig = {
	resource: 'salesOrder';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["salesOrder"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["salesOrder"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1SalesOrderUpdateConfig = {
	resource: 'salesOrder';
	operation: 'update';
/**
 * ID of the sales order to update
 * @displayOptions.show { resource: ["salesOrder"], operation: ["update"] }
 */
		salesOrderId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ZohoCrmV1VendorCreateConfig = {
	resource: 'vendor';
	operation: 'create';
	vendorName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new record, or update the current one if it already exists (upsert) */
export type ZohoCrmV1VendorUpsertConfig = {
	resource: 'vendor';
	operation: 'upsert';
/**
 * Name of the vendor. If a record with this vendor name exists it will be updated, otherwise a new one will be created.
 * @displayOptions.show { resource: ["vendor"], operation: ["upsert"] }
 */
		vendorName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ZohoCrmV1VendorDeleteConfig = {
	resource: 'vendor';
	operation: 'delete';
/**
 * ID of the vendor to delete
 * @displayOptions.show { resource: ["vendor"], operation: ["delete"] }
 */
		vendorId: string | Expression<string>;
};

/** Get an account */
export type ZohoCrmV1VendorGetConfig = {
	resource: 'vendor';
	operation: 'get';
/**
 * ID of the vendor to retrieve
 * @displayOptions.show { resource: ["vendor"], operation: ["get"] }
 */
		vendorId: string | Expression<string>;
};

/** Get many accounts */
export type ZohoCrmV1VendorGetAllConfig = {
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
 * @default 5
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an account */
export type ZohoCrmV1VendorUpdateConfig = {
	resource: 'vendor';
	operation: 'update';
/**
 * ID of the vendor to update
 * @displayOptions.show { resource: ["vendor"], operation: ["update"] }
 */
		vendorId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ZohoCrmV1Params =
	| ZohoCrmV1AccountCreateConfig
	| ZohoCrmV1AccountUpsertConfig
	| ZohoCrmV1AccountDeleteConfig
	| ZohoCrmV1AccountGetConfig
	| ZohoCrmV1AccountGetAllConfig
	| ZohoCrmV1AccountUpdateConfig
	| ZohoCrmV1ContactCreateConfig
	| ZohoCrmV1ContactUpsertConfig
	| ZohoCrmV1ContactDeleteConfig
	| ZohoCrmV1ContactGetConfig
	| ZohoCrmV1ContactGetAllConfig
	| ZohoCrmV1ContactUpdateConfig
	| ZohoCrmV1DealCreateConfig
	| ZohoCrmV1DealUpsertConfig
	| ZohoCrmV1DealDeleteConfig
	| ZohoCrmV1DealGetConfig
	| ZohoCrmV1DealGetAllConfig
	| ZohoCrmV1DealUpdateConfig
	| ZohoCrmV1InvoiceCreateConfig
	| ZohoCrmV1InvoiceUpsertConfig
	| ZohoCrmV1InvoiceDeleteConfig
	| ZohoCrmV1InvoiceGetConfig
	| ZohoCrmV1InvoiceGetAllConfig
	| ZohoCrmV1InvoiceUpdateConfig
	| ZohoCrmV1LeadCreateConfig
	| ZohoCrmV1LeadUpsertConfig
	| ZohoCrmV1LeadDeleteConfig
	| ZohoCrmV1LeadGetConfig
	| ZohoCrmV1LeadGetFieldsConfig
	| ZohoCrmV1LeadGetAllConfig
	| ZohoCrmV1LeadUpdateConfig
	| ZohoCrmV1ProductCreateConfig
	| ZohoCrmV1ProductUpsertConfig
	| ZohoCrmV1ProductDeleteConfig
	| ZohoCrmV1ProductGetConfig
	| ZohoCrmV1ProductGetAllConfig
	| ZohoCrmV1ProductUpdateConfig
	| ZohoCrmV1PurchaseOrderCreateConfig
	| ZohoCrmV1PurchaseOrderUpsertConfig
	| ZohoCrmV1PurchaseOrderDeleteConfig
	| ZohoCrmV1PurchaseOrderGetConfig
	| ZohoCrmV1PurchaseOrderGetAllConfig
	| ZohoCrmV1PurchaseOrderUpdateConfig
	| ZohoCrmV1QuoteCreateConfig
	| ZohoCrmV1QuoteUpsertConfig
	| ZohoCrmV1QuoteDeleteConfig
	| ZohoCrmV1QuoteGetConfig
	| ZohoCrmV1QuoteGetAllConfig
	| ZohoCrmV1QuoteUpdateConfig
	| ZohoCrmV1SalesOrderCreateConfig
	| ZohoCrmV1SalesOrderUpsertConfig
	| ZohoCrmV1SalesOrderDeleteConfig
	| ZohoCrmV1SalesOrderGetConfig
	| ZohoCrmV1SalesOrderGetAllConfig
	| ZohoCrmV1SalesOrderUpdateConfig
	| ZohoCrmV1VendorCreateConfig
	| ZohoCrmV1VendorUpsertConfig
	| ZohoCrmV1VendorDeleteConfig
	| ZohoCrmV1VendorGetConfig
	| ZohoCrmV1VendorGetAllConfig
	| ZohoCrmV1VendorUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZohoCrmV1Credentials {
	zohoOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ZohoCrmV1NodeBase {
	type: 'n8n-nodes-base.zohoCrm';
	version: 1;
	credentials?: ZohoCrmV1Credentials;
}

export type ZohoCrmV1AccountCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1AccountCreateConfig>;
};

export type ZohoCrmV1AccountUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1AccountUpsertConfig>;
};

export type ZohoCrmV1AccountDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1AccountDeleteConfig>;
};

export type ZohoCrmV1AccountGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1AccountGetConfig>;
};

export type ZohoCrmV1AccountGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1AccountGetAllConfig>;
};

export type ZohoCrmV1AccountUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1AccountUpdateConfig>;
};

export type ZohoCrmV1ContactCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ContactCreateConfig>;
};

export type ZohoCrmV1ContactUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ContactUpsertConfig>;
};

export type ZohoCrmV1ContactDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ContactDeleteConfig>;
};

export type ZohoCrmV1ContactGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ContactGetConfig>;
};

export type ZohoCrmV1ContactGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ContactGetAllConfig>;
};

export type ZohoCrmV1ContactUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ContactUpdateConfig>;
};

export type ZohoCrmV1DealCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1DealCreateConfig>;
};

export type ZohoCrmV1DealUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1DealUpsertConfig>;
};

export type ZohoCrmV1DealDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1DealDeleteConfig>;
};

export type ZohoCrmV1DealGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1DealGetConfig>;
};

export type ZohoCrmV1DealGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1DealGetAllConfig>;
};

export type ZohoCrmV1DealUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1DealUpdateConfig>;
};

export type ZohoCrmV1InvoiceCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1InvoiceCreateConfig>;
};

export type ZohoCrmV1InvoiceUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1InvoiceUpsertConfig>;
};

export type ZohoCrmV1InvoiceDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1InvoiceDeleteConfig>;
};

export type ZohoCrmV1InvoiceGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1InvoiceGetConfig>;
};

export type ZohoCrmV1InvoiceGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1InvoiceGetAllConfig>;
};

export type ZohoCrmV1InvoiceUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1InvoiceUpdateConfig>;
};

export type ZohoCrmV1LeadCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadCreateConfig>;
};

export type ZohoCrmV1LeadUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadUpsertConfig>;
};

export type ZohoCrmV1LeadDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadDeleteConfig>;
};

export type ZohoCrmV1LeadGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadGetConfig>;
};

export type ZohoCrmV1LeadGetFieldsNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadGetFieldsConfig>;
};

export type ZohoCrmV1LeadGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadGetAllConfig>;
};

export type ZohoCrmV1LeadUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1LeadUpdateConfig>;
};

export type ZohoCrmV1ProductCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ProductCreateConfig>;
};

export type ZohoCrmV1ProductUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ProductUpsertConfig>;
};

export type ZohoCrmV1ProductDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ProductDeleteConfig>;
};

export type ZohoCrmV1ProductGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ProductGetConfig>;
};

export type ZohoCrmV1ProductGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ProductGetAllConfig>;
};

export type ZohoCrmV1ProductUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1ProductUpdateConfig>;
};

export type ZohoCrmV1PurchaseOrderCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1PurchaseOrderCreateConfig>;
};

export type ZohoCrmV1PurchaseOrderUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1PurchaseOrderUpsertConfig>;
};

export type ZohoCrmV1PurchaseOrderDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1PurchaseOrderDeleteConfig>;
};

export type ZohoCrmV1PurchaseOrderGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1PurchaseOrderGetConfig>;
};

export type ZohoCrmV1PurchaseOrderGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1PurchaseOrderGetAllConfig>;
};

export type ZohoCrmV1PurchaseOrderUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1PurchaseOrderUpdateConfig>;
};

export type ZohoCrmV1QuoteCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1QuoteCreateConfig>;
};

export type ZohoCrmV1QuoteUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1QuoteUpsertConfig>;
};

export type ZohoCrmV1QuoteDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1QuoteDeleteConfig>;
};

export type ZohoCrmV1QuoteGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1QuoteGetConfig>;
};

export type ZohoCrmV1QuoteGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1QuoteGetAllConfig>;
};

export type ZohoCrmV1QuoteUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1QuoteUpdateConfig>;
};

export type ZohoCrmV1SalesOrderCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1SalesOrderCreateConfig>;
};

export type ZohoCrmV1SalesOrderUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1SalesOrderUpsertConfig>;
};

export type ZohoCrmV1SalesOrderDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1SalesOrderDeleteConfig>;
};

export type ZohoCrmV1SalesOrderGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1SalesOrderGetConfig>;
};

export type ZohoCrmV1SalesOrderGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1SalesOrderGetAllConfig>;
};

export type ZohoCrmV1SalesOrderUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1SalesOrderUpdateConfig>;
};

export type ZohoCrmV1VendorCreateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1VendorCreateConfig>;
};

export type ZohoCrmV1VendorUpsertNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1VendorUpsertConfig>;
};

export type ZohoCrmV1VendorDeleteNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1VendorDeleteConfig>;
};

export type ZohoCrmV1VendorGetNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1VendorGetConfig>;
};

export type ZohoCrmV1VendorGetAllNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1VendorGetAllConfig>;
};

export type ZohoCrmV1VendorUpdateNode = ZohoCrmV1NodeBase & {
	config: NodeConfig<ZohoCrmV1VendorUpdateConfig>;
};

export type ZohoCrmV1Node =
	| ZohoCrmV1AccountCreateNode
	| ZohoCrmV1AccountUpsertNode
	| ZohoCrmV1AccountDeleteNode
	| ZohoCrmV1AccountGetNode
	| ZohoCrmV1AccountGetAllNode
	| ZohoCrmV1AccountUpdateNode
	| ZohoCrmV1ContactCreateNode
	| ZohoCrmV1ContactUpsertNode
	| ZohoCrmV1ContactDeleteNode
	| ZohoCrmV1ContactGetNode
	| ZohoCrmV1ContactGetAllNode
	| ZohoCrmV1ContactUpdateNode
	| ZohoCrmV1DealCreateNode
	| ZohoCrmV1DealUpsertNode
	| ZohoCrmV1DealDeleteNode
	| ZohoCrmV1DealGetNode
	| ZohoCrmV1DealGetAllNode
	| ZohoCrmV1DealUpdateNode
	| ZohoCrmV1InvoiceCreateNode
	| ZohoCrmV1InvoiceUpsertNode
	| ZohoCrmV1InvoiceDeleteNode
	| ZohoCrmV1InvoiceGetNode
	| ZohoCrmV1InvoiceGetAllNode
	| ZohoCrmV1InvoiceUpdateNode
	| ZohoCrmV1LeadCreateNode
	| ZohoCrmV1LeadUpsertNode
	| ZohoCrmV1LeadDeleteNode
	| ZohoCrmV1LeadGetNode
	| ZohoCrmV1LeadGetFieldsNode
	| ZohoCrmV1LeadGetAllNode
	| ZohoCrmV1LeadUpdateNode
	| ZohoCrmV1ProductCreateNode
	| ZohoCrmV1ProductUpsertNode
	| ZohoCrmV1ProductDeleteNode
	| ZohoCrmV1ProductGetNode
	| ZohoCrmV1ProductGetAllNode
	| ZohoCrmV1ProductUpdateNode
	| ZohoCrmV1PurchaseOrderCreateNode
	| ZohoCrmV1PurchaseOrderUpsertNode
	| ZohoCrmV1PurchaseOrderDeleteNode
	| ZohoCrmV1PurchaseOrderGetNode
	| ZohoCrmV1PurchaseOrderGetAllNode
	| ZohoCrmV1PurchaseOrderUpdateNode
	| ZohoCrmV1QuoteCreateNode
	| ZohoCrmV1QuoteUpsertNode
	| ZohoCrmV1QuoteDeleteNode
	| ZohoCrmV1QuoteGetNode
	| ZohoCrmV1QuoteGetAllNode
	| ZohoCrmV1QuoteUpdateNode
	| ZohoCrmV1SalesOrderCreateNode
	| ZohoCrmV1SalesOrderUpsertNode
	| ZohoCrmV1SalesOrderDeleteNode
	| ZohoCrmV1SalesOrderGetNode
	| ZohoCrmV1SalesOrderGetAllNode
	| ZohoCrmV1SalesOrderUpdateNode
	| ZohoCrmV1VendorCreateNode
	| ZohoCrmV1VendorUpsertNode
	| ZohoCrmV1VendorDeleteNode
	| ZohoCrmV1VendorGetNode
	| ZohoCrmV1VendorGetAllNode
	| ZohoCrmV1VendorUpdateNode
	;