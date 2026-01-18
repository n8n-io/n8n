/**
 * Invoice Ninja Node - Version 1
 * Consume Invoice Ninja API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new client */
export type InvoiceNinjaV1BankTransactionCreateConfig = {
	resource: 'bank_transaction';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type InvoiceNinjaV1BankTransactionDeleteConfig = {
	resource: 'bank_transaction';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	bankTransactionId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1BankTransactionGetConfig = {
	resource: 'bank_transaction';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	bankTransactionId: string | Expression<string>;
};

/** Get data of many clients */
export type InvoiceNinjaV1BankTransactionGetAllConfig = {
	resource: 'bank_transaction';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["bank_transaction"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["bank_transaction"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Match payment to a bank transaction */
export type InvoiceNinjaV1BankTransactionMatchPaymentConfig = {
	resource: 'bank_transaction';
	operation: 'matchPayment';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	bankTransactionId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["bank_transaction"], operation: ["matchPayment"] }
 */
		paymentId?: string | Expression<string>;
};

/** Create a new client */
export type InvoiceNinjaV1ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	billingAddressUi?: {
		billingAddressValue?: {
			/** Street Address
			 */
			streetAddress?: string | Expression<string>;
			/** Apt/Suite
			 */
			aptSuite?: string | Expression<string>;
			/** City
			 */
			city?: string | Expression<string>;
			/** State
			 */
			state?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			countryCode?: string | Expression<string>;
		};
	};
	contactsUi?: {
		contacstValues?: Array<{
			/** First Name
			 */
			firstName?: string | Expression<string>;
			/** Last Name
			 */
			lastName?: string | Expression<string>;
			/** Email
			 */
			email?: string | Expression<string>;
			/** Phone
			 */
			phone?: string | Expression<string>;
		}>;
	};
	shippingAddressUi?: {
		shippingAddressValue?: {
			/** Street Address
			 */
			streetAddress?: string | Expression<string>;
			/** Apt/Suite
			 */
			aptSuite?: string | Expression<string>;
			/** City
			 */
			city?: string | Expression<string>;
			/** State
			 */
			state?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			countryCode?: string | Expression<string>;
		};
	};
};

/** Delete a client */
export type InvoiceNinjaV1ClientDeleteConfig = {
	resource: 'client';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	clientId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1ClientGetConfig = {
	resource: 'client';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	clientId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV1ClientGetAllConfig = {
	resource: 'client';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["client"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["client"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV1ExpenseCreateConfig = {
	resource: 'expense';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type InvoiceNinjaV1ExpenseDeleteConfig = {
	resource: 'expense';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	expenseId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1ExpenseGetConfig = {
	resource: 'expense';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	expenseId: string | Expression<string>;
};

/** Get data of many clients */
export type InvoiceNinjaV1ExpenseGetAllConfig = {
	resource: 'expense';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["expense"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["expense"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a new client */
export type InvoiceNinjaV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	invoiceItemsUi?: {
		invoiceItemsValues?: Array<{
			/** Cost
			 * @default 0
			 */
			cost?: number | Expression<number>;
			/** Description
			 */
			description?: string | Expression<string>;
			/** Service
			 */
			service?: string | Expression<string>;
			/** Hours
			 * @default 0
			 */
			hours?: number | Expression<number>;
			/** Tax Name 1
			 */
			taxName1?: string | Expression<string>;
			/** Tax Name 2
			 */
			taxName2?: string | Expression<string>;
			/** Tax Rate 1
			 * @default 0
			 */
			taxRate1?: number | Expression<number>;
			/** Tax Rate 2
			 * @default 0
			 */
			taxRate2?: number | Expression<number>;
		}>;
	};
};

/** Delete a client */
export type InvoiceNinjaV1InvoiceDeleteConfig = {
	resource: 'invoice';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	invoiceId: string | Expression<string>;
};

/** Email an invoice */
export type InvoiceNinjaV1InvoiceEmailConfig = {
	resource: 'invoice';
	operation: 'email';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	invoiceId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	invoiceId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV1InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV1PaymentCreateConfig = {
	resource: 'payment';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["payment"] }
 */
		invoice?: string | Expression<string>;
	amount?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type InvoiceNinjaV1PaymentDeleteConfig = {
	resource: 'payment';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	paymentId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1PaymentGetConfig = {
	resource: 'payment';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	paymentId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV1PaymentGetAllConfig = {
	resource: 'payment';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV1QuoteCreateConfig = {
	resource: 'quote';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	invoiceItemsUi?: {
		invoiceItemsValues?: Array<{
			/** Cost
			 * @default 0
			 */
			cost?: number | Expression<number>;
			/** Description
			 */
			description?: string | Expression<string>;
			/** Service
			 */
			service?: string | Expression<string>;
			/** Hours
			 * @default 0
			 */
			hours?: number | Expression<number>;
			/** Tax Name 1
			 */
			taxName1?: string | Expression<string>;
			/** Tax Name 2
			 */
			taxName2?: string | Expression<string>;
			/** Tax Rate 1
			 * @default 0
			 */
			taxRate1?: number | Expression<number>;
			/** Tax Rate 2
			 * @default 0
			 */
			taxRate2?: number | Expression<number>;
		}>;
	};
};

/** Delete a client */
export type InvoiceNinjaV1QuoteDeleteConfig = {
	resource: 'quote';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	quoteId: string | Expression<string>;
};

/** Email an invoice */
export type InvoiceNinjaV1QuoteEmailConfig = {
	resource: 'quote';
	operation: 'email';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	quoteId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1QuoteGetConfig = {
	resource: 'quote';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	quoteId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV1QuoteGetAllConfig = {
	resource: 'quote';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["quote"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["quote"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	timeLogsUi?: {
		timeLogsValues?: Array<{
			/** Start Date
			 */
			startDate?: string | Expression<string>;
			/** End Date
			 */
			endDate?: string | Expression<string>;
			/** Duration (Hours)
			 * @default 0
			 */
			duration?: number | Expression<number>;
		}>;
	};
};

/** Delete a client */
export type InvoiceNinjaV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	taskId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	taskId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type InvoiceNinjaV1Params =
	| InvoiceNinjaV1BankTransactionCreateConfig
	| InvoiceNinjaV1BankTransactionDeleteConfig
	| InvoiceNinjaV1BankTransactionGetConfig
	| InvoiceNinjaV1BankTransactionGetAllConfig
	| InvoiceNinjaV1BankTransactionMatchPaymentConfig
	| InvoiceNinjaV1ClientCreateConfig
	| InvoiceNinjaV1ClientDeleteConfig
	| InvoiceNinjaV1ClientGetConfig
	| InvoiceNinjaV1ClientGetAllConfig
	| InvoiceNinjaV1ExpenseCreateConfig
	| InvoiceNinjaV1ExpenseDeleteConfig
	| InvoiceNinjaV1ExpenseGetConfig
	| InvoiceNinjaV1ExpenseGetAllConfig
	| InvoiceNinjaV1InvoiceCreateConfig
	| InvoiceNinjaV1InvoiceDeleteConfig
	| InvoiceNinjaV1InvoiceEmailConfig
	| InvoiceNinjaV1InvoiceGetConfig
	| InvoiceNinjaV1InvoiceGetAllConfig
	| InvoiceNinjaV1PaymentCreateConfig
	| InvoiceNinjaV1PaymentDeleteConfig
	| InvoiceNinjaV1PaymentGetConfig
	| InvoiceNinjaV1PaymentGetAllConfig
	| InvoiceNinjaV1QuoteCreateConfig
	| InvoiceNinjaV1QuoteDeleteConfig
	| InvoiceNinjaV1QuoteEmailConfig
	| InvoiceNinjaV1QuoteGetConfig
	| InvoiceNinjaV1QuoteGetAllConfig
	| InvoiceNinjaV1TaskCreateConfig
	| InvoiceNinjaV1TaskDeleteConfig
	| InvoiceNinjaV1TaskGetConfig
	| InvoiceNinjaV1TaskGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface InvoiceNinjaV1Credentials {
	invoiceNinjaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type InvoiceNinjaV1Node = {
	type: 'n8n-nodes-base.invoiceNinja';
	version: 1;
	config: NodeConfig<InvoiceNinjaV1Params>;
	credentials?: InvoiceNinjaV1Credentials;
};