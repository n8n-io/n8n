/**
 * Zoho CRM Node - Version 1
 * Consume Zoho CRM API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type ZohoCrmV1Node = {
	type: 'n8n-nodes-base.zohoCrm';
	version: 1;
	config: NodeConfig<ZohoCrmV1Params>;
	credentials?: ZohoCrmV1Credentials;
};