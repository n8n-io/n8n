/**
 * QuickBooks Online Node - Version 1
 * Consume the QuickBooks Online API
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
// Output Types
// ===========================================================================

export type QuickbooksV1BillGetAllOutput = {
	APAccountRef?: {
		name?: string;
		value?: string;
	};
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	DocNumber?: string;
	domain?: string;
	DueDate?: string;
	Id?: string;
	Line?: Array<{
		AccountBasedExpenseLineDetail?: {
			AccountRef?: {
				name?: string;
				value?: string;
			};
			BillableStatus?: string;
			TaxCodeRef?: {
				value?: string;
			};
		};
		Description?: string;
		DetailType?: string;
		Id?: string;
		ItemBasedExpenseLineDetail?: {
			BillableStatus?: string;
			ItemRef?: {
				name?: string;
				value?: string;
			};
			Qty?: number;
			TaxCodeRef?: {
				value?: string;
			};
		};
		LineNum?: number;
	}>;
	LinkedTxn?: Array<{
		TxnId?: string;
		TxnType?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	SalesTermRef?: {
		value?: string;
	};
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
	VendorRef?: {
		name?: string;
		value?: string;
	};
};

export type QuickbooksV1CustomerCreateOutput = {
	Active?: boolean;
	Balance?: number;
	BalanceWithJobs?: number;
	BillWithParent?: boolean;
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	DefaultTaxCodeRef?: {
		value?: string;
	};
	DisplayName?: string;
	domain?: string;
	FullyQualifiedName?: string;
	Id?: string;
	IsProject?: boolean;
	Job?: boolean;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PreferredDeliveryMethod?: string;
	PrintOnCheckName?: string;
	sparse?: boolean;
	SyncToken?: string;
	Taxable?: boolean;
};

export type QuickbooksV1CustomerGetOutput = {
	Active?: boolean;
	BillWithParent?: boolean;
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	DefaultTaxCodeRef?: {
		value?: string;
	};
	DisplayName?: string;
	domain?: string;
	FullyQualifiedName?: string;
	Id?: string;
	IsProject?: boolean;
	Job?: boolean;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PreferredDeliveryMethod?: string;
	PrintOnCheckName?: string;
	sparse?: boolean;
	SyncToken?: string;
	Taxable?: boolean;
};

export type QuickbooksV1CustomerGetAllOutput = {
	Active?: boolean;
	BillAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Line1?: string;
		PostalCode?: string;
	};
	BillWithParent?: boolean;
	CompanyName?: string;
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	DisplayName?: string;
	domain?: string;
	FullyQualifiedName?: string;
	Id?: string;
	Job?: boolean;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PreferredDeliveryMethod?: string;
	PrimaryEmailAddr?: {
		Address?: string;
	};
	PrimaryPhone?: {
		FreeFormNumber?: string;
	};
	PrintOnCheckName?: string;
	ShipAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Line1?: string;
		PostalCode?: string;
	};
	sparse?: boolean;
	SyncToken?: string;
	Taxable?: boolean;
};

export type QuickbooksV1InvoiceCreateOutput = {
	AllowIPNPayment?: boolean;
	AllowOnlineACHPayment?: boolean;
	AllowOnlineCreditCardPayment?: boolean;
	AllowOnlinePayment?: boolean;
	ApplyTaxAfterDiscount?: boolean;
	BillAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Lat?: string;
		Line1?: string;
		Long?: string;
		PostalCode?: string;
	};
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	CustomerRef?: {
		name?: string;
		value?: string;
	};
	CustomField?: Array<{
		DefinitionId?: string;
		Name?: string;
		Type?: string;
	}>;
	DocNumber?: string;
	domain?: string;
	DueDate?: string;
	EmailStatus?: string;
	Id?: string;
	Line?: Array<{
		Description?: string;
		DetailType?: string;
		Id?: string;
		LineNum?: number;
		SalesItemLineDetail?: {
			ItemAccountRef?: {
				name?: string;
				value?: string;
			};
			ItemRef?: {
				name?: string;
				value?: string;
			};
			TaxCodeRef?: {
				value?: string;
			};
		};
	}>;
	LinkedTxn?: Array<{
		TxnId?: string;
		TxnType?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastModifiedByRef?: {
			value?: string;
		};
		LastUpdatedTime?: string;
	};
	PrintStatus?: string;
	ShipFromAddr?: {
		Id?: string;
		Line1?: string;
		Line2?: string;
	};
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
};

export type QuickbooksV1InvoiceGetOutput = {
	AllowIPNPayment?: boolean;
	AllowOnlineACHPayment?: boolean;
	AllowOnlineCreditCardPayment?: boolean;
	AllowOnlinePayment?: boolean;
	ApplyTaxAfterDiscount?: boolean;
	BillAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Line1?: string;
		PostalCode?: string;
	};
	BillEmail?: {
		Address?: string;
	};
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	CustomerRef?: {
		name?: string;
		value?: string;
	};
	CustomField?: Array<{
		DefinitionId?: string;
		Name?: string;
		Type?: string;
	}>;
	DocNumber?: string;
	domain?: string;
	DueDate?: string;
	EmailStatus?: string;
	Id?: string;
	Line?: Array<{
		Description?: string;
		DetailType?: string;
		Id?: string;
		LineNum?: number;
		SalesItemLineDetail?: {
			ItemAccountRef?: {
				name?: string;
				value?: string;
			};
			ItemRef?: {
				name?: string;
				value?: string;
			};
			TaxCodeRef?: {
				value?: string;
			};
		};
	}>;
	LinkedTxn?: Array<{
		TxnId?: string;
		TxnType?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastModifiedByRef?: {
			value?: string;
		};
		LastUpdatedTime?: string;
	};
	PrintStatus?: string;
	SalesTermRef?: {
		name?: string;
		value?: string;
	};
	ShipAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Line1?: string;
		PostalCode?: string;
	};
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
	TxnTaxDetail?: {
		TaxLine?: Array<{
			DetailType?: string;
			TaxLineDetail?: {
				PercentBased?: boolean;
				TaxRateRef?: {
					value?: string;
				};
			};
		}>;
	};
};

export type QuickbooksV1InvoiceGetAllOutput = {
	AllowIPNPayment?: boolean;
	AllowOnlineACHPayment?: boolean;
	AllowOnlineCreditCardPayment?: boolean;
	AllowOnlinePayment?: boolean;
	ApplyTaxAfterDiscount?: boolean;
	BillAddr?: {
		Id?: string;
		Line1?: string;
		Line2?: string;
		Line3?: string;
	};
	BillEmail?: {
		Address?: string;
	};
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	CustomerMemo?: {
		value?: string;
	};
	CustomerRef?: {
		name?: string;
		value?: string;
	};
	CustomField?: Array<{
		DefinitionId?: string;
		Name?: string;
		Type?: string;
	}>;
	DocNumber?: string;
	domain?: string;
	DueDate?: string;
	EmailStatus?: string;
	Id?: string;
	Line?: Array<{
		Description?: string;
		DetailType?: string;
		Id?: string;
		LineNum?: number;
		SalesItemLineDetail?: {
			ItemRef?: {
				name?: string;
				value?: string;
			};
			TaxCodeRef?: {
				value?: string;
			};
		};
	}>;
	LinkedTxn?: Array<{
		TxnId?: string;
		TxnType?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PrintStatus?: string;
	SalesTermRef?: {
		name?: string;
		value?: string;
	};
	ShipAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Line1?: string;
		PostalCode?: string;
	};
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
	TxnTaxDetail?: {
		TaxLine?: Array<{
			DetailType?: string;
			TaxLineDetail?: {
				PercentBased?: boolean;
				TaxRateRef?: {
					value?: string;
				};
			};
		}>;
		TxnTaxCodeRef?: {
			value?: string;
		};
	};
};

export type QuickbooksV1InvoiceSendOutput = {
	AllowIPNPayment?: boolean;
	AllowOnlineACHPayment?: boolean;
	AllowOnlineCreditCardPayment?: boolean;
	AllowOnlinePayment?: boolean;
	ApplyTaxAfterDiscount?: boolean;
	BillEmail?: {
		Address?: string;
	};
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	CustomerRef?: {
		name?: string;
		value?: string;
	};
	DeliveryInfo?: {
		DeliveryTime?: string;
		DeliveryType?: string;
	};
	DocNumber?: string;
	domain?: string;
	DueDate?: string;
	EmailStatus?: string;
	Id?: string;
	Line?: Array<{
		Description?: string;
		DetailType?: string;
		Id?: string;
		LineNum?: number;
		SalesItemLineDetail?: {
			ItemRef?: {
				name?: string;
				value?: string;
			};
			TaxCodeRef?: {
				value?: string;
			};
		};
	}>;
	LinkedTxn?: Array<{
		TxnId?: string;
		TxnType?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PrintStatus?: string;
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
};

export type QuickbooksV1ItemGetOutput = {
	Active?: boolean;
	DeferredRevenue?: boolean;
	Description?: string;
	domain?: string;
	FullyQualifiedName?: string;
	Id?: string;
	IncomeAccountRef?: {
		name?: string;
		value?: string;
	};
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	Name?: string;
	sparse?: boolean;
	SyncToken?: string;
	Taxable?: boolean;
	TrackQtyOnHand?: boolean;
	Type?: string;
	UnitPrice?: number;
};

export type QuickbooksV1ItemGetAllOutput = {
	Active?: boolean;
	Description?: string;
	domain?: string;
	FullyQualifiedName?: string;
	Id?: string;
	IncomeAccountRef?: {
		name?: string;
		value?: string;
	};
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	Name?: string;
	sparse?: boolean;
	SyncToken?: string;
	Taxable?: boolean;
	TrackQtyOnHand?: boolean;
	Type?: string;
};

export type QuickbooksV1PaymentGetOutput = {
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	CustomerRef?: {
		name?: string;
		value?: string;
	};
	DepositToAccountRef?: {
		value?: string;
	};
	domain?: string;
	ExchangeRate?: number;
	Id?: string;
	Line?: Array<{
		LineEx?: {
			any?: Array<{
				declaredType?: string;
				globalScope?: boolean;
				name?: string;
				nil?: boolean;
				scope?: string;
				typeSubstituted?: boolean;
				value?: {
					Name?: string;
					Value?: string;
				};
			}>;
		};
		LinkedTxn?: Array<{
			TxnId?: string;
			TxnType?: string;
		}>;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PaymentMethodRef?: {
		value?: string;
	};
	PaymentRefNum?: string;
	ProcessPayment?: boolean;
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
	UnappliedAmt?: number;
};

export type QuickbooksV1PaymentGetAllOutput = {
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	CustomerRef?: {
		name?: string;
		value?: string;
	};
	DepositToAccountRef?: {
		value?: string;
	};
	domain?: string;
	Id?: string;
	Line?: Array<{
		LineEx?: {
			any?: Array<{
				declaredType?: string;
				globalScope?: boolean;
				name?: string;
				nil?: boolean;
				scope?: string;
				typeSubstituted?: boolean;
				value?: {
					Name?: string;
					Value?: string;
				};
			}>;
		};
		LinkedTxn?: Array<{
			TxnId?: string;
			TxnType?: string;
		}>;
	}>;
	LinkedTxn?: Array<{
		TxnId?: string;
		TxnType?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PaymentMethodRef?: {
		value?: string;
	};
	ProcessPayment?: boolean;
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
};

export type QuickbooksV1PurchaseGetAllOutput = {
	AccountRef?: {
		name?: string;
		value?: string;
	};
	Credit?: boolean;
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	domain?: string;
	EntityRef?: {
		name?: string;
		type?: string;
		value?: string;
	};
	Id?: string;
	Line?: Array<{
		AccountBasedExpenseLineDetail?: {
			AccountRef?: {
				name?: string;
				value?: string;
			};
			BillableStatus?: string;
			TaxCodeRef?: {
				value?: string;
			};
		};
		DetailType?: string;
		Id?: string;
	}>;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	PaymentType?: string;
	PurchaseEx?: {
		any?: Array<{
			declaredType?: string;
			globalScope?: boolean;
			name?: string;
			nil?: boolean;
			scope?: string;
			typeSubstituted?: boolean;
			value?: {
				Name?: string;
				Value?: string;
			};
		}>;
	};
	sparse?: boolean;
	SyncToken?: string;
	TxnDate?: string;
};

export type QuickbooksV1TransactionGetReportOutput = {
	account_name?: string;
	doc_num?: string;
	is_no_post?: string;
	memo?: string;
	name?: string;
	other_account?: string;
	subt_nat_amount?: string;
	tx_date?: string;
	txn_type?: string;
};

export type QuickbooksV1VendorGetAllOutput = {
	AcctNum?: string;
	Active?: boolean;
	BillAddr?: {
		City?: string;
		CountrySubDivisionCode?: string;
		Id?: string;
		Lat?: string;
		Line1?: string;
		Long?: string;
		PostalCode?: string;
	};
	CompanyName?: string;
	CurrencyRef?: {
		name?: string;
		value?: string;
	};
	DisplayName?: string;
	domain?: string;
	FamilyName?: string;
	Fax?: {
		FreeFormNumber?: string;
	};
	GivenName?: string;
	Id?: string;
	MetaData?: {
		CreateTime?: string;
		LastUpdatedTime?: string;
	};
	Mobile?: {
		FreeFormNumber?: string;
	};
	PrimaryEmailAddr?: {
		Address?: string;
	};
	PrimaryPhone?: {
		FreeFormNumber?: string;
	};
	PrintOnCheckName?: string;
	sparse?: boolean;
	SyncToken?: string;
	Vendor1099?: boolean;
	WebAddr?: {
		URI?: string;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface QuickbooksV1Credentials {
	quickBooksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface QuickbooksV1NodeBase {
	type: 'n8n-nodes-base.quickbooks';
	version: 1;
	credentials?: QuickbooksV1Credentials;
}

export type QuickbooksV1BillCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1BillCreateConfig>;
};

export type QuickbooksV1BillDeleteNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1BillDeleteConfig>;
};

export type QuickbooksV1BillGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1BillGetConfig>;
};

export type QuickbooksV1BillGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1BillGetAllConfig>;
	output?: QuickbooksV1BillGetAllOutput;
};

export type QuickbooksV1BillUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1BillUpdateConfig>;
};

export type QuickbooksV1CustomerCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1CustomerCreateConfig>;
	output?: QuickbooksV1CustomerCreateOutput;
};

export type QuickbooksV1CustomerGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1CustomerGetConfig>;
	output?: QuickbooksV1CustomerGetOutput;
};

export type QuickbooksV1CustomerGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1CustomerGetAllConfig>;
	output?: QuickbooksV1CustomerGetAllOutput;
};

export type QuickbooksV1CustomerUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1CustomerUpdateConfig>;
};

export type QuickbooksV1EmployeeCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EmployeeCreateConfig>;
};

export type QuickbooksV1EmployeeGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EmployeeGetConfig>;
};

export type QuickbooksV1EmployeeGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EmployeeGetAllConfig>;
};

export type QuickbooksV1EmployeeUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EmployeeUpdateConfig>;
};

export type QuickbooksV1EstimateCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EstimateCreateConfig>;
};

export type QuickbooksV1EstimateDeleteNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EstimateDeleteConfig>;
};

export type QuickbooksV1EstimateGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EstimateGetConfig>;
};

export type QuickbooksV1EstimateGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EstimateGetAllConfig>;
};

export type QuickbooksV1EstimateSendNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EstimateSendConfig>;
};

export type QuickbooksV1EstimateUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1EstimateUpdateConfig>;
};

export type QuickbooksV1InvoiceCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceCreateConfig>;
	output?: QuickbooksV1InvoiceCreateOutput;
};

export type QuickbooksV1InvoiceDeleteNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceDeleteConfig>;
};

export type QuickbooksV1InvoiceGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceGetConfig>;
	output?: QuickbooksV1InvoiceGetOutput;
};

export type QuickbooksV1InvoiceGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceGetAllConfig>;
	output?: QuickbooksV1InvoiceGetAllOutput;
};

export type QuickbooksV1InvoiceSendNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceSendConfig>;
	output?: QuickbooksV1InvoiceSendOutput;
};

export type QuickbooksV1InvoiceUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceUpdateConfig>;
};

export type QuickbooksV1InvoiceVoidNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1InvoiceVoidConfig>;
};

export type QuickbooksV1ItemGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1ItemGetConfig>;
	output?: QuickbooksV1ItemGetOutput;
};

export type QuickbooksV1ItemGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1ItemGetAllConfig>;
	output?: QuickbooksV1ItemGetAllOutput;
};

export type QuickbooksV1PaymentCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentCreateConfig>;
};

export type QuickbooksV1PaymentDeleteNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentDeleteConfig>;
};

export type QuickbooksV1PaymentGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentGetConfig>;
	output?: QuickbooksV1PaymentGetOutput;
};

export type QuickbooksV1PaymentGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentGetAllConfig>;
	output?: QuickbooksV1PaymentGetAllOutput;
};

export type QuickbooksV1PaymentSendNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentSendConfig>;
};

export type QuickbooksV1PaymentUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentUpdateConfig>;
};

export type QuickbooksV1PaymentVoidNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PaymentVoidConfig>;
};

export type QuickbooksV1PurchaseGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PurchaseGetConfig>;
};

export type QuickbooksV1PurchaseGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1PurchaseGetAllConfig>;
	output?: QuickbooksV1PurchaseGetAllOutput;
};

export type QuickbooksV1TransactionGetReportNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1TransactionGetReportConfig>;
	output?: QuickbooksV1TransactionGetReportOutput;
};

export type QuickbooksV1VendorCreateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1VendorCreateConfig>;
};

export type QuickbooksV1VendorGetNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1VendorGetConfig>;
};

export type QuickbooksV1VendorGetAllNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1VendorGetAllConfig>;
	output?: QuickbooksV1VendorGetAllOutput;
};

export type QuickbooksV1VendorUpdateNode = QuickbooksV1NodeBase & {
	config: NodeConfig<QuickbooksV1VendorUpdateConfig>;
};

export type QuickbooksV1Node =
	| QuickbooksV1BillCreateNode
	| QuickbooksV1BillDeleteNode
	| QuickbooksV1BillGetNode
	| QuickbooksV1BillGetAllNode
	| QuickbooksV1BillUpdateNode
	| QuickbooksV1CustomerCreateNode
	| QuickbooksV1CustomerGetNode
	| QuickbooksV1CustomerGetAllNode
	| QuickbooksV1CustomerUpdateNode
	| QuickbooksV1EmployeeCreateNode
	| QuickbooksV1EmployeeGetNode
	| QuickbooksV1EmployeeGetAllNode
	| QuickbooksV1EmployeeUpdateNode
	| QuickbooksV1EstimateCreateNode
	| QuickbooksV1EstimateDeleteNode
	| QuickbooksV1EstimateGetNode
	| QuickbooksV1EstimateGetAllNode
	| QuickbooksV1EstimateSendNode
	| QuickbooksV1EstimateUpdateNode
	| QuickbooksV1InvoiceCreateNode
	| QuickbooksV1InvoiceDeleteNode
	| QuickbooksV1InvoiceGetNode
	| QuickbooksV1InvoiceGetAllNode
	| QuickbooksV1InvoiceSendNode
	| QuickbooksV1InvoiceUpdateNode
	| QuickbooksV1InvoiceVoidNode
	| QuickbooksV1ItemGetNode
	| QuickbooksV1ItemGetAllNode
	| QuickbooksV1PaymentCreateNode
	| QuickbooksV1PaymentDeleteNode
	| QuickbooksV1PaymentGetNode
	| QuickbooksV1PaymentGetAllNode
	| QuickbooksV1PaymentSendNode
	| QuickbooksV1PaymentUpdateNode
	| QuickbooksV1PaymentVoidNode
	| QuickbooksV1PurchaseGetNode
	| QuickbooksV1PurchaseGetAllNode
	| QuickbooksV1TransactionGetReportNode
	| QuickbooksV1VendorCreateNode
	| QuickbooksV1VendorGetNode
	| QuickbooksV1VendorGetAllNode
	| QuickbooksV1VendorUpdateNode
	;