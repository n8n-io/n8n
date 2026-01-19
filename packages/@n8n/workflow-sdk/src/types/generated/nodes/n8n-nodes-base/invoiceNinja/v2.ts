/**
 * Invoice Ninja Node - Version 2
 * Consume Invoice Ninja API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
export type InvoiceNinjaV2BankTransactionMatchPaymentConfig = {
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
export type InvoiceNinjaV2ClientCreateConfig = {
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
export type InvoiceNinjaV2InvoiceCreateConfig = {
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
export type InvoiceNinjaV2PaymentCreateConfig = {
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
export type InvoiceNinjaV2QuoteCreateConfig = {
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
export type InvoiceNinjaV2TaskCreateConfig = {
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
	| InvoiceNinjaV2TaskGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type InvoiceNinjaV2InvoiceGetAllOutput = {
	archived_at?: number;
	assigned_user_id?: string;
	auto_bill_enabled?: boolean;
	balance?: number;
	client_id?: string;
	created_at?: number;
	custom_surcharge_tax1?: boolean;
	custom_surcharge_tax2?: boolean;
	custom_surcharge_tax3?: boolean;
	custom_surcharge_tax4?: boolean;
	custom_surcharge1?: number;
	custom_surcharge2?: number;
	custom_surcharge3?: number;
	custom_surcharge4?: number;
	custom_value1?: string;
	custom_value2?: string;
	custom_value3?: string;
	custom_value4?: string;
	date?: string;
	design_id?: string;
	discount?: number;
	due_date?: string;
	entity_type?: string;
	exchange_rate?: number;
	footer?: string;
	has_expenses?: boolean;
	has_tasks?: boolean;
	id?: string;
	invitations?: Array<{
		archived_at?: number;
		client_contact_id?: string;
		created_at?: number;
		email_error?: string;
		email_status?: string;
		id?: string;
		key?: string;
		link?: string;
		message_id?: string;
		opened_date?: string;
		sent_date?: string;
		updated_at?: number;
		viewed_date?: string;
	}>;
	is_amount_discount?: boolean;
	is_deleted?: boolean;
	last_sent_date?: string;
	line_items?: Array<{
		_id?: string;
		custom_value1?: string;
		custom_value2?: string;
		custom_value3?: string;
		custom_value4?: string;
		date?: string;
		discount?: number;
		expense_id?: string;
		is_amount_discount?: boolean;
		notes?: string;
		product_cost?: number;
		product_key?: string;
		sort_id?: string;
		task_id?: string;
		tax_amount?: number;
		tax_id?: string;
		tax_name1?: string;
		tax_name2?: string;
		tax_name3?: string;
		tax_rate1?: number;
		tax_rate2?: number;
		tax_rate3?: number;
		type_id?: string;
		unit_code?: string;
	}>;
	next_send_date?: string;
	number?: string;
	partial?: number;
	partial_due_date?: string;
	po_number?: string;
	private_notes?: string;
	project_id?: string;
	public_notes?: string;
	recurring_id?: string;
	reminder_last_sent?: string;
	reminder1_sent?: string;
	reminder2_sent?: string;
	reminder3_sent?: string;
	status_id?: string;
	subscription_id?: string;
	tax_name1?: string;
	tax_name2?: string;
	tax_name3?: string;
	tax_rate2?: number;
	tax_rate3?: number;
	terms?: string;
	updated_at?: number;
	user_id?: string;
	uses_inclusive_taxes?: boolean;
	vendor_id?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface InvoiceNinjaV2Credentials {
	invoiceNinjaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface InvoiceNinjaV2NodeBase {
	type: 'n8n-nodes-base.invoiceNinja';
	version: 2;
	credentials?: InvoiceNinjaV2Credentials;
}

export type InvoiceNinjaV2BankTransactionCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2BankTransactionCreateConfig>;
};

export type InvoiceNinjaV2BankTransactionDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2BankTransactionDeleteConfig>;
};

export type InvoiceNinjaV2BankTransactionGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2BankTransactionGetConfig>;
};

export type InvoiceNinjaV2BankTransactionGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2BankTransactionGetAllConfig>;
};

export type InvoiceNinjaV2BankTransactionMatchPaymentNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2BankTransactionMatchPaymentConfig>;
};

export type InvoiceNinjaV2ClientCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ClientCreateConfig>;
};

export type InvoiceNinjaV2ClientDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ClientDeleteConfig>;
};

export type InvoiceNinjaV2ClientGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ClientGetConfig>;
};

export type InvoiceNinjaV2ClientGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ClientGetAllConfig>;
};

export type InvoiceNinjaV2ExpenseCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ExpenseCreateConfig>;
};

export type InvoiceNinjaV2ExpenseDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ExpenseDeleteConfig>;
};

export type InvoiceNinjaV2ExpenseGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ExpenseGetConfig>;
};

export type InvoiceNinjaV2ExpenseGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2ExpenseGetAllConfig>;
};

export type InvoiceNinjaV2InvoiceCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2InvoiceCreateConfig>;
};

export type InvoiceNinjaV2InvoiceDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2InvoiceDeleteConfig>;
};

export type InvoiceNinjaV2InvoiceEmailNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2InvoiceEmailConfig>;
};

export type InvoiceNinjaV2InvoiceGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2InvoiceGetConfig>;
};

export type InvoiceNinjaV2InvoiceGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2InvoiceGetAllConfig>;
	output?: InvoiceNinjaV2InvoiceGetAllOutput;
};

export type InvoiceNinjaV2PaymentCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2PaymentCreateConfig>;
};

export type InvoiceNinjaV2PaymentDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2PaymentDeleteConfig>;
};

export type InvoiceNinjaV2PaymentGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2PaymentGetConfig>;
};

export type InvoiceNinjaV2PaymentGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2PaymentGetAllConfig>;
};

export type InvoiceNinjaV2QuoteCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2QuoteCreateConfig>;
};

export type InvoiceNinjaV2QuoteDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2QuoteDeleteConfig>;
};

export type InvoiceNinjaV2QuoteEmailNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2QuoteEmailConfig>;
};

export type InvoiceNinjaV2QuoteGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2QuoteGetConfig>;
};

export type InvoiceNinjaV2QuoteGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2QuoteGetAllConfig>;
};

export type InvoiceNinjaV2TaskCreateNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2TaskCreateConfig>;
};

export type InvoiceNinjaV2TaskDeleteNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2TaskDeleteConfig>;
};

export type InvoiceNinjaV2TaskGetNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2TaskGetConfig>;
};

export type InvoiceNinjaV2TaskGetAllNode = InvoiceNinjaV2NodeBase & {
	config: NodeConfig<InvoiceNinjaV2TaskGetAllConfig>;
};

export type InvoiceNinjaV2Node =
	| InvoiceNinjaV2BankTransactionCreateNode
	| InvoiceNinjaV2BankTransactionDeleteNode
	| InvoiceNinjaV2BankTransactionGetNode
	| InvoiceNinjaV2BankTransactionGetAllNode
	| InvoiceNinjaV2BankTransactionMatchPaymentNode
	| InvoiceNinjaV2ClientCreateNode
	| InvoiceNinjaV2ClientDeleteNode
	| InvoiceNinjaV2ClientGetNode
	| InvoiceNinjaV2ClientGetAllNode
	| InvoiceNinjaV2ExpenseCreateNode
	| InvoiceNinjaV2ExpenseDeleteNode
	| InvoiceNinjaV2ExpenseGetNode
	| InvoiceNinjaV2ExpenseGetAllNode
	| InvoiceNinjaV2InvoiceCreateNode
	| InvoiceNinjaV2InvoiceDeleteNode
	| InvoiceNinjaV2InvoiceEmailNode
	| InvoiceNinjaV2InvoiceGetNode
	| InvoiceNinjaV2InvoiceGetAllNode
	| InvoiceNinjaV2PaymentCreateNode
	| InvoiceNinjaV2PaymentDeleteNode
	| InvoiceNinjaV2PaymentGetNode
	| InvoiceNinjaV2PaymentGetAllNode
	| InvoiceNinjaV2QuoteCreateNode
	| InvoiceNinjaV2QuoteDeleteNode
	| InvoiceNinjaV2QuoteEmailNode
	| InvoiceNinjaV2QuoteGetNode
	| InvoiceNinjaV2QuoteGetAllNode
	| InvoiceNinjaV2TaskCreateNode
	| InvoiceNinjaV2TaskDeleteNode
	| InvoiceNinjaV2TaskGetNode
	| InvoiceNinjaV2TaskGetAllNode
	;