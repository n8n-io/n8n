/**
 * Invoice Ninja Node Types
 *
 * Consume Invoice Ninja API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/invoiceninja/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new client */
export type InvoiceNinjaV2BankTransactionCreateConfig = {
	resource: 'bank_transaction';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type InvoiceNinjaV2BankTransactionDeleteConfig = {
	resource: 'bank_transaction';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	bankTransactionId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2BankTransactionGetConfig = {
	resource: 'bank_transaction';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	bankTransactionId: string | Expression<string>;
};

/** Get data of many clients */
export type InvoiceNinjaV2BankTransactionGetAllConfig = {
	resource: 'bank_transaction';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
};

/** Match payment to a bank transaction */
export type InvoiceNinjaV2BankTransactionMatchPaymentConfig = {
	resource: 'bank_transaction';
	operation: 'matchPayment';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	bankTransactionId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	paymentId?: string | Expression<string>;
};

/** Create a new client */
export type InvoiceNinjaV2ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	billingAddressUi?: {
		billingAddressValue?: {
			streetAddress?: string | Expression<string>;
			aptSuite?: string | Expression<string>;
			city?: string | Expression<string>;
			state?: string | Expression<string>;
			postalCode?: string | Expression<string>;
			countryCode?: string | Expression<string>;
		};
	};
	contactsUi?: {
		contacstValues?: Array<{
			firstName?: string | Expression<string>;
			lastName?: string | Expression<string>;
			email?: string | Expression<string>;
			phone?: string | Expression<string>;
		}>;
	};
	shippingAddressUi?: {
		shippingAddressValue?: {
			streetAddress?: string | Expression<string>;
			aptSuite?: string | Expression<string>;
			city?: string | Expression<string>;
			state?: string | Expression<string>;
			postalCode?: string | Expression<string>;
			countryCode?: string | Expression<string>;
		};
	};
};

/** Delete a client */
export type InvoiceNinjaV2ClientDeleteConfig = {
	resource: 'client';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	clientId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2ClientGetConfig = {
	resource: 'client';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	clientId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV2ClientGetAllConfig = {
	resource: 'client';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV2ExpenseCreateConfig = {
	resource: 'expense';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type InvoiceNinjaV2ExpenseDeleteConfig = {
	resource: 'expense';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	expenseId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2ExpenseGetConfig = {
	resource: 'expense';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	expenseId: string | Expression<string>;
};

/** Get data of many clients */
export type InvoiceNinjaV2ExpenseGetAllConfig = {
	resource: 'expense';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
};

/** Create a new client */
export type InvoiceNinjaV2InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	invoiceItemsUi?: {
		invoiceItemsValues?: Array<{
			cost?: number | Expression<number>;
			description?: string | Expression<string>;
			service?: string | Expression<string>;
			hours?: number | Expression<number>;
			taxName1?: string | Expression<string>;
			taxName2?: string | Expression<string>;
			taxRate1?: number | Expression<number>;
			taxRate2?: number | Expression<number>;
		}>;
	};
};

/** Delete a client */
export type InvoiceNinjaV2InvoiceDeleteConfig = {
	resource: 'invoice';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	invoiceId: string | Expression<string>;
};

/** Email an invoice */
export type InvoiceNinjaV2InvoiceEmailConfig = {
	resource: 'invoice';
	operation: 'email';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	invoiceId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	invoiceId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV2InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV2PaymentCreateConfig = {
	resource: 'payment';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	invoice?: string | Expression<string>;
	amount?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type InvoiceNinjaV2PaymentDeleteConfig = {
	resource: 'payment';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	paymentId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2PaymentGetConfig = {
	resource: 'payment';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	paymentId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV2PaymentGetAllConfig = {
	resource: 'payment';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV2QuoteCreateConfig = {
	resource: 'quote';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	invoiceItemsUi?: {
		invoiceItemsValues?: Array<{
			cost?: number | Expression<number>;
			description?: string | Expression<string>;
			service?: string | Expression<string>;
			hours?: number | Expression<number>;
			taxName1?: string | Expression<string>;
			taxName2?: string | Expression<string>;
			taxRate1?: number | Expression<number>;
			taxRate2?: number | Expression<number>;
		}>;
	};
};

/** Delete a client */
export type InvoiceNinjaV2QuoteDeleteConfig = {
	resource: 'quote';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	quoteId: string | Expression<string>;
};

/** Email an invoice */
export type InvoiceNinjaV2QuoteEmailConfig = {
	resource: 'quote';
	operation: 'email';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	quoteId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2QuoteGetConfig = {
	resource: 'quote';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	quoteId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV2QuoteGetAllConfig = {
	resource: 'quote';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Create a new client */
export type InvoiceNinjaV2TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	timeLogsUi?: {
		timeLogsValues?: Array<{
			startDate?: string | Expression<string>;
			endDate?: string | Expression<string>;
			duration?: number | Expression<number>;
		}>;
	};
};

/** Delete a client */
export type InvoiceNinjaV2TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	taskId: string | Expression<string>;
};

/** Get data of a client */
export type InvoiceNinjaV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
	taskId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get data of many clients */
export type InvoiceNinjaV2TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	apiVersion?: 'v4' | 'v5' | Expression<string>;
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
	options?: Record<string, unknown>;
};

export type InvoiceNinjaV2Params =
	| InvoiceNinjaV2BankTransactionCreateConfig
	| InvoiceNinjaV2BankTransactionDeleteConfig
	| InvoiceNinjaV2BankTransactionGetConfig
	| InvoiceNinjaV2BankTransactionGetAllConfig
	| InvoiceNinjaV2BankTransactionMatchPaymentConfig
	| InvoiceNinjaV2ClientCreateConfig
	| InvoiceNinjaV2ClientDeleteConfig
	| InvoiceNinjaV2ClientGetConfig
	| InvoiceNinjaV2ClientGetAllConfig
	| InvoiceNinjaV2ExpenseCreateConfig
	| InvoiceNinjaV2ExpenseDeleteConfig
	| InvoiceNinjaV2ExpenseGetConfig
	| InvoiceNinjaV2ExpenseGetAllConfig
	| InvoiceNinjaV2InvoiceCreateConfig
	| InvoiceNinjaV2InvoiceDeleteConfig
	| InvoiceNinjaV2InvoiceEmailConfig
	| InvoiceNinjaV2InvoiceGetConfig
	| InvoiceNinjaV2InvoiceGetAllConfig
	| InvoiceNinjaV2PaymentCreateConfig
	| InvoiceNinjaV2PaymentDeleteConfig
	| InvoiceNinjaV2PaymentGetConfig
	| InvoiceNinjaV2PaymentGetAllConfig
	| InvoiceNinjaV2QuoteCreateConfig
	| InvoiceNinjaV2QuoteDeleteConfig
	| InvoiceNinjaV2QuoteEmailConfig
	| InvoiceNinjaV2QuoteGetConfig
	| InvoiceNinjaV2QuoteGetAllConfig
	| InvoiceNinjaV2TaskCreateConfig
	| InvoiceNinjaV2TaskDeleteConfig
	| InvoiceNinjaV2TaskGetConfig
	| InvoiceNinjaV2TaskGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface InvoiceNinjaV2Credentials {
	invoiceNinjaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type InvoiceNinjaV2Node = {
	type: 'n8n-nodes-base.invoiceNinja';
	version: 1 | 2;
	config: NodeConfig<InvoiceNinjaV2Params>;
	credentials?: InvoiceNinjaV2Credentials;
};

export type InvoiceNinjaNode = InvoiceNinjaV2Node;
