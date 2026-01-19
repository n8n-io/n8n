/**
 * Xero Node - Version 1
 * Consume Xero API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a contact */
export type XeroV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		organizationId: string | Expression<string>;
/**
 * Full name of contact/organisation
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a contact */
export type XeroV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		organizationId: string | Expression<string>;
	contactId: string | Expression<string>;
};

/** Get many contacts */
export type XeroV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 */
		organizationId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a contact */
export type XeroV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
 */
		organizationId: string | Expression<string>;
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a contact */
export type XeroV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
 */
		organizationId: string | Expression<string>;
/**
 * Invoice Type
 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
 */
		type: 'ACCPAY' | 'ACCREC' | Expression<string>;
	contactId: string | Expression<string>;
/**
 * Line item data
 * @displayOptions.show { resource: ["invoice"], operation: ["create"] }
 * @default {}
 */
		lineItemsUi?: {
		lineItemsValues?: Array<{
			/** A line item with just a description
			 */
			description?: string | Expression<string>;
			/** LineItem Quantity
			 * @default 1
			 */
			quantity?: number | Expression<number>;
			/** Lineitem unit amount. By default, unit amount will be rounded to two decimal places.
			 */
			unitAmount?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			itemCode?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			accountCode?: string | Expression<string>;
			/** Tax Type
			 */
			taxType?: 'INPUT' | 'NONE' | 'OUTPUT' | 'GSTONIMPORTS' | Expression<string>;
			/** The tax amount is auto calculated as a percentage of the line amount based on the tax rate
			 */
			taxAmount?: string | Expression<string>;
			/** The line amount reflects the discounted price if a DiscountRate has been used
			 */
			lineAmount?: string | Expression<string>;
			/** Percentage discount or discount amount being applied to a line item. Only supported on ACCREC invoices - ACCPAY invoices and credit notes in Xero do not support discounts.
			 */
			discountRate?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Get a contact */
export type XeroV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["invoice"], operation: ["get"] }
 */
		organizationId: string | Expression<string>;
	invoiceId: string | Expression<string>;
};

/** Get many contacts */
export type XeroV1InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"] }
 */
		organizationId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a contact */
export type XeroV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["invoice"], operation: ["update"] }
 */
		organizationId: string | Expression<string>;
	invoiceId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type XeroV1Params =
	| XeroV1ContactCreateConfig
	| XeroV1ContactGetConfig
	| XeroV1ContactGetAllConfig
	| XeroV1ContactUpdateConfig
	| XeroV1InvoiceCreateConfig
	| XeroV1InvoiceGetConfig
	| XeroV1InvoiceGetAllConfig
	| XeroV1InvoiceUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type XeroV1ContactCreateOutput = {
	Addresses?: Array<{
		AddressType?: string;
		City?: string;
		Country?: string;
		PostalCode?: string;
		Region?: string;
	}>;
	BankAccountDetails?: string;
	ContactID?: string;
	ContactStatus?: string;
	EmailAddress?: string;
	HasValidationErrors?: boolean;
	IsCustomer?: boolean;
	IsSupplier?: boolean;
	Name?: string;
	Phones?: Array<{
		PhoneAreaCode?: string;
		PhoneCountryCode?: string;
		PhoneNumber?: string;
		PhoneType?: string;
	}>;
	UpdatedDateUTC?: string;
};

export type XeroV1ContactGetOutput = {
	Addresses?: Array<{
		AddressLine1?: string;
		AddressType?: string;
		City?: string;
		Country?: string;
		PostalCode?: string;
		Region?: string;
	}>;
	BankAccountDetails?: string;
	ContactGroups?: Array<{
		ContactGroupID?: string;
		HasValidationErrors?: boolean;
		Name?: string;
		Status?: string;
	}>;
	ContactID?: string;
	ContactPersons?: Array<{
		EmailAddress?: string;
		FirstName?: string;
		IncludeInEmails?: boolean;
		LastName?: string;
	}>;
	ContactStatus?: string;
	EmailAddress?: string;
	HasAttachments?: boolean;
	HasValidationErrors?: boolean;
	IsCustomer?: boolean;
	IsSupplier?: boolean;
	Name?: string;
	Phones?: Array<{
		PhoneAreaCode?: string;
		PhoneCountryCode?: string;
		PhoneNumber?: string;
		PhoneType?: string;
	}>;
	UpdatedDateUTC?: string;
};

export type XeroV1ContactGetAllOutput = {
	Addresses?: Array<{
		AddressType?: string;
		City?: string;
		Country?: string;
		PostalCode?: string;
		Region?: string;
	}>;
	BankAccountDetails?: string;
	ContactID?: string;
	ContactStatus?: string;
	EmailAddress?: string;
	HasAttachments?: boolean;
	HasValidationErrors?: boolean;
	IsCustomer?: boolean;
	IsSupplier?: boolean;
	Name?: string;
	Phones?: Array<{
		PhoneAreaCode?: string;
		PhoneCountryCode?: string;
		PhoneNumber?: string;
		PhoneType?: string;
	}>;
	UpdatedDateUTC?: string;
};

export type XeroV1InvoiceCreateOutput = {
	AmountPaid?: number;
	BrandingThemeID?: string;
	Contact?: {
		Addresses?: Array<{
			AddressType?: string;
			City?: string;
			Country?: string;
			PostalCode?: string;
			Region?: string;
		}>;
		BankAccountDetails?: string;
		ContactGroups?: Array<{
			ContactGroupID?: string;
			HasValidationErrors?: boolean;
			Name?: string;
			Status?: string;
		}>;
		ContactID?: string;
		ContactPersons?: Array<{
			EmailAddress?: string;
			FirstName?: string;
			IncludeInEmails?: boolean;
			LastName?: string;
		}>;
		ContactStatus?: string;
		EmailAddress?: string;
		HasValidationErrors?: boolean;
		IsCustomer?: boolean;
		IsSupplier?: boolean;
		Name?: string;
		Phones?: Array<{
			PhoneAreaCode?: string;
			PhoneCountryCode?: string;
			PhoneNumber?: string;
			PhoneType?: string;
		}>;
		UpdatedDateUTC?: string;
	};
	CurrencyCode?: string;
	CurrencyRate?: number;
	Date?: string;
	DateString?: string;
	HasErrors?: boolean;
	InvoiceID?: string;
	InvoiceNumber?: string;
	IsDiscounted?: boolean;
	LineAmountTypes?: string;
	LineItems?: Array<{
		Description?: string;
		LineItemID?: string;
		TaxType?: string;
	}>;
	Reference?: string;
	SentToContact?: boolean;
	Status?: string;
	Type?: string;
	UpdatedDateUTC?: string;
};

export type XeroV1InvoiceGetOutput = {
	Attachments?: Array<{
		AttachmentID?: string;
		ContentLength?: number;
		FileName?: string;
		MimeType?: string;
		Url?: string;
	}>;
	BrandingThemeID?: string;
	Contact?: {
		AccountsReceivableTaxType?: string;
		Addresses?: Array<{
			AddressLine1?: string;
			AddressType?: string;
			City?: string;
			Country?: string;
			PostalCode?: string;
			Region?: string;
		}>;
		BankAccountDetails?: string;
		ContactGroups?: Array<{
			ContactGroupID?: string;
			HasValidationErrors?: boolean;
			Name?: string;
			Status?: string;
		}>;
		ContactID?: string;
		ContactPersons?: Array<{
			EmailAddress?: string;
			FirstName?: string;
			IncludeInEmails?: boolean;
			LastName?: string;
		}>;
		ContactStatus?: string;
		DefaultCurrency?: string;
		EmailAddress?: string;
		FirstName?: string;
		HasValidationErrors?: boolean;
		IsCustomer?: boolean;
		IsSupplier?: boolean;
		LastName?: string;
		Name?: string;
		Phones?: Array<{
			PhoneAreaCode?: string;
			PhoneCountryCode?: string;
			PhoneNumber?: string;
			PhoneType?: string;
		}>;
		PurchasesTrackingCategories?: Array<{
			TrackingCategoryName?: string;
			TrackingOptionName?: string;
		}>;
		SalesTrackingCategories?: Array<{
			TrackingCategoryName?: string;
			TrackingOptionName?: string;
		}>;
		UpdatedDateUTC?: string;
	};
	CurrencyCode?: string;
	Date?: string;
	DateString?: string;
	DueDate?: string;
	DueDateString?: string;
	HasAttachments?: boolean;
	HasErrors?: boolean;
	InvoiceID?: string;
	InvoiceNumber?: string;
	IsDiscounted?: boolean;
	LineAmountTypes?: string;
	LineItems?: Array<{
		AccountCode?: string;
		AccountID?: string;
		Description?: string;
		LineItemID?: string;
		TaxType?: string;
		Tracking?: Array<{
			Name?: string;
			Option?: string;
			TrackingCategoryID?: string;
			TrackingOptionID?: string;
		}>;
	}>;
	Overpayments?: Array<{
		AppliedAmount?: number;
		CurrencyRate?: number;
		Date?: string;
		DateString?: string;
		OverpaymentID?: string;
		Total?: number;
	}>;
	Reference?: string;
	SentToContact?: boolean;
	Status?: string;
	Type?: string;
	UpdatedDateUTC?: string;
	Url?: string;
};

export type XeroV1InvoiceGetAllOutput = {
	BrandingThemeID?: string;
	Contact?: {
		ContactID?: string;
		HasValidationErrors?: boolean;
		Name?: string;
	};
	CreditNotes?: Array<{
		CreditNoteID?: string;
		CreditNoteNumber?: string;
		Date?: string;
		DateString?: string;
		HasErrors?: boolean;
		ID?: string;
	}>;
	CurrencyCode?: string;
	Date?: string;
	DateString?: string;
	DueDate?: string;
	DueDateString?: string;
	HasAttachments?: boolean;
	HasErrors?: boolean;
	InvoiceID?: string;
	InvoiceNumber?: string;
	IsDiscounted?: boolean;
	LineAmountTypes?: string;
	LineItems?: Array<{
		AccountCode?: string;
		AccountID?: string;
		Description?: string;
		Item?: {
			Code?: string;
			ItemID?: string;
			Name?: string;
		};
		ItemCode?: string;
		LineItemID?: string;
		TaxType?: string;
		Tracking?: Array<{
			Name?: string;
			Option?: string;
			TrackingCategoryID?: string;
		}>;
	}>;
	Overpayments?: Array<{
		AppliedAmount?: number;
		Date?: string;
		DateString?: string;
		OverpaymentID?: string;
		Total?: number;
	}>;
	Payments?: Array<{
		Date?: string;
		HasAccount?: boolean;
		HasValidationErrors?: boolean;
		Reference?: string;
	}>;
	Reference?: string;
	SentToContact?: boolean;
	Status?: string;
	Type?: string;
	UpdatedDateUTC?: string;
};

export type XeroV1InvoiceUpdateOutput = {
	AmountPaid?: number;
	BrandingThemeID?: string;
	Contact?: {
		Addresses?: Array<{
			AddressType?: string;
			City?: string;
			Country?: string;
			PostalCode?: string;
			Region?: string;
		}>;
		BankAccountDetails?: string;
		ContactID?: string;
		ContactStatus?: string;
		EmailAddress?: string;
		HasValidationErrors?: boolean;
		IsCustomer?: boolean;
		IsSupplier?: boolean;
		Name?: string;
		Phones?: Array<{
			PhoneAreaCode?: string;
			PhoneCountryCode?: string;
			PhoneNumber?: string;
			PhoneType?: string;
		}>;
		UpdatedDateUTC?: string;
	};
	CurrencyCode?: string;
	CurrencyRate?: number;
	Date?: string;
	DateString?: string;
	DueDate?: string;
	DueDateString?: string;
	HasErrors?: boolean;
	InvoiceID?: string;
	InvoiceNumber?: string;
	IsDiscounted?: boolean;
	LineAmountTypes?: string;
	LineItems?: Array<{
		AccountCode?: string;
		AccountID?: string;
		Description?: string;
		Item?: {
			Code?: string;
			ItemID?: string;
			Name?: string;
		};
		ItemCode?: string;
		LineItemID?: string;
		Quantity?: number;
		TaxType?: string;
	}>;
	Reference?: string;
	SentToContact?: boolean;
	Status?: string;
	Type?: string;
	UpdatedDateUTC?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface XeroV1Credentials {
	xeroOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface XeroV1NodeBase {
	type: 'n8n-nodes-base.xero';
	version: 1;
	credentials?: XeroV1Credentials;
}

export type XeroV1ContactCreateNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1ContactCreateConfig>;
	output?: XeroV1ContactCreateOutput;
};

export type XeroV1ContactGetNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1ContactGetConfig>;
	output?: XeroV1ContactGetOutput;
};

export type XeroV1ContactGetAllNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1ContactGetAllConfig>;
	output?: XeroV1ContactGetAllOutput;
};

export type XeroV1ContactUpdateNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1ContactUpdateConfig>;
};

export type XeroV1InvoiceCreateNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1InvoiceCreateConfig>;
	output?: XeroV1InvoiceCreateOutput;
};

export type XeroV1InvoiceGetNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1InvoiceGetConfig>;
	output?: XeroV1InvoiceGetOutput;
};

export type XeroV1InvoiceGetAllNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1InvoiceGetAllConfig>;
	output?: XeroV1InvoiceGetAllOutput;
};

export type XeroV1InvoiceUpdateNode = XeroV1NodeBase & {
	config: NodeConfig<XeroV1InvoiceUpdateConfig>;
	output?: XeroV1InvoiceUpdateOutput;
};

export type XeroV1Node =
	| XeroV1ContactCreateNode
	| XeroV1ContactGetNode
	| XeroV1ContactGetAllNode
	| XeroV1ContactUpdateNode
	| XeroV1InvoiceCreateNode
	| XeroV1InvoiceGetNode
	| XeroV1InvoiceGetAllNode
	| XeroV1InvoiceUpdateNode
	;