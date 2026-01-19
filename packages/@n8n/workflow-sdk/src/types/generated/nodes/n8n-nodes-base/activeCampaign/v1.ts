/**
 * ActiveCampaign Node - Version 1
 * Create and edit data in ActiveCampaign
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an account */
export type ActiveCampaignV1AccountCreateConfig = {
	resource: 'account';
	operation: 'create';
/**
 * Account's name
 * @displayOptions.show { operation: ["create"], resource: ["account"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ActiveCampaignV1AccountDeleteConfig = {
	resource: 'account';
	operation: 'delete';
/**
 * ID of the account to delete
 * @displayOptions.show { operation: ["delete"], resource: ["account"] }
 * @default 0
 */
		accountId: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
/**
 * ID of the account to get
 * @displayOptions.show { operation: ["get"], resource: ["account"] }
 * @default 0
 */
		accountId: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1AccountGetAllConfig = {
	resource: 'account';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["account"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["account"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["account"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
};

/** Update an account */
export type ActiveCampaignV1AccountUpdateConfig = {
	resource: 'account';
	operation: 'update';
/**
 * ID of the account to update
 * @displayOptions.show { operation: ["update"], resource: ["account"] }
 * @default 0
 */
		accountId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["account"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ActiveCampaignV1AccountContactCreateConfig = {
	resource: 'accountContact';
	operation: 'create';
	account: number | Expression<number>;
	contact: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ActiveCampaignV1AccountContactDeleteConfig = {
	resource: 'accountContact';
	operation: 'delete';
/**
 * ID of the account contact to delete
 * @displayOptions.show { operation: ["delete"], resource: ["accountContact"] }
 * @default 0
 */
		accountContactId: number | Expression<number>;
};

/** Update an account */
export type ActiveCampaignV1AccountContactUpdateConfig = {
	resource: 'accountContact';
	operation: 'update';
/**
 * Account ID
 * @displayOptions.show { operation: ["update"], resource: ["accountContact"] }
 */
		accountContactId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["accountContact"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ActiveCampaignV1ConnectionCreateConfig = {
	resource: 'connection';
	operation: 'create';
/**
 * The name of the service
 * @displayOptions.show { operation: ["create"], resource: ["connection"] }
 */
		service: string | Expression<string>;
/**
 * The ID of the account in the external service
 * @displayOptions.show { operation: ["create"], resource: ["connection"] }
 */
		externalid: string | Expression<string>;
/**
 * The name associated with the account in the external service. Often this will be a company name (e.g., "My Toystore, Inc.").
 * @displayOptions.show { operation: ["create"], resource: ["connection"] }
 */
		name: string | Expression<string>;
/**
 * The URL to a logo image for the external service
 * @displayOptions.show { operation: ["create"], resource: ["connection"] }
 */
		logoUrl: string | Expression<string>;
/**
 * The URL to a page where the integration with the external service can be managed in the third-party's website
 * @displayOptions.show { operation: ["create"], resource: ["connection"] }
 */
		linkUrl: string | Expression<string>;
};

/** Delete an account */
export type ActiveCampaignV1ConnectionDeleteConfig = {
	resource: 'connection';
	operation: 'delete';
/**
 * ID of the connection to delete
 * @displayOptions.show { operation: ["delete"], resource: ["connection"] }
 * @default 0
 */
		connectionId: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1ConnectionGetConfig = {
	resource: 'connection';
	operation: 'get';
/**
 * ID of the connection to get
 * @displayOptions.show { operation: ["get"], resource: ["connection"] }
 * @default 0
 */
		connectionId: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1ConnectionGetAllConfig = {
	resource: 'connection';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["connection"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["connection"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["connection"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Update an account */
export type ActiveCampaignV1ConnectionUpdateConfig = {
	resource: 'connection';
	operation: 'update';
/**
 * ID of the connection to update
 * @displayOptions.show { operation: ["update"], resource: ["connection"] }
 * @default 0
 */
		connectionId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["connection"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ActiveCampaignV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
/**
 * The email of the contact to create
 * @displayOptions.show { operation: ["create"], resource: ["contact"] }
 */
		email: string | Expression<string>;
/**
 * Whether to update user if it exists already. If not set and user exists it will error instead.
 * @displayOptions.show { operation: ["create"], resource: ["contact"] }
 * @default false
 */
		updateIfExists?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ActiveCampaignV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * ID of the contact to delete
 * @displayOptions.show { operation: ["delete"], resource: ["contact"] }
 * @default 0
 */
		contactId: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * ID of the contact to get
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
 * @default 0
 */
		contactId: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Update an account */
export type ActiveCampaignV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
/**
 * ID of the contact to update
 * @displayOptions.show { operation: ["update"], resource: ["contact"] }
 * @default 0
 */
		contactId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["contact"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Add contact to a list */
export type ActiveCampaignV1ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	listId: number | Expression<number>;
	contactId: number | Expression<number>;
};

/** Remove contact from a list */
export type ActiveCampaignV1ContactListRemoveConfig = {
	resource: 'contactList';
	operation: 'remove';
	listId: number | Expression<number>;
	contactId: number | Expression<number>;
};

/** Add contact to a list */
export type ActiveCampaignV1ContactTagAddConfig = {
	resource: 'contactTag';
	operation: 'add';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["add"], resource: ["contactTag"] }
 */
		tagId: string | Expression<string>;
	contactId: number | Expression<number>;
};

/** Remove contact from a list */
export type ActiveCampaignV1ContactTagRemoveConfig = {
	resource: 'contactTag';
	operation: 'remove';
/**
 * ID of the contact tag to delete
 * @displayOptions.show { operation: ["remove"], resource: ["contactTag"] }
 * @default 0
 */
		contactTagId: number | Expression<number>;
};

/** Create an account */
export type ActiveCampaignV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
/**
 * The title of the deal
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 */
		title: string | Expression<string>;
/**
 * The ID of the deal's contact
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 * @default 0
 */
		contact: number | Expression<number>;
/**
 * The value of the deal in cents
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 * @default 0
 */
		value: number | Expression<number>;
/**
 * The currency of the deal in 3-character ISO format
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 * @default eur
 */
		currency: 'eur' | 'usd' | 'gbp' | 'chf' | 'cny' | '' | 'aed' | 'afn' | 'all' | 'amd' | 'ang' | 'aoa' | 'ars' | 'aud' | 'awg' | 'azn' | 'bam' | 'bbd' | 'bdt' | 'bgn' | 'bhd' | 'bif' | 'bmd' | 'bnd' | 'bob' | 'brl' | 'bsd' | 'btc' | 'btn' | 'bwp' | 'byn' | 'bzd' | 'cad' | 'cdf' | 'clf' | 'clp' | 'cnh' | 'cop' | 'crc' | 'cuc' | 'cup' | 'cve' | 'czk' | 'djf' | 'dkk' | 'dop' | 'dzd' | 'egp' | 'ern' | 'etb' | 'fjd' | 'fkp' | 'gel' | 'ggp' | 'ghs' | 'gip' | 'gmd' | 'gnf' | 'gtq' | 'gyd' | 'hkd' | 'hnl' | 'hrk' | 'htg' | 'huf' | 'idr' | 'ils' | 'imp' | 'inr' | 'iqd' | 'irr' | 'isk' | 'jep' | 'jmd' | 'jod' | 'jpy' | 'kes' | 'kgs' | 'khr' | 'kmf' | 'kpw' | 'krw' | 'kwd' | 'kyd' | 'kzt' | 'lak' | 'lbp' | 'lkr' | 'lrd' | 'lsl' | 'lyd' | 'mad' | 'mdl' | 'mga' | 'mkd' | 'mmk' | 'mnt' | 'mop' | 'mro' | 'mru' | 'mur' | 'mvr' | 'mwk' | 'mxn' | 'myr' | 'mzn' | 'nad' | 'ngn' | 'nio' | 'nok' | 'npr' | 'nzd' | 'omr' | 'pab' | 'pen' | 'pgk' | 'php' | 'pkr' | 'pln' | 'pyg' | 'qar' | 'ron' | 'rsd' | 'rub' | 'rwf' | 'sar' | 'sbd' | 'scr' | 'sdg' | 'sek' | 'sgd' | 'shp' | 'sll' | 'sos' | 'srd' | 'ssp' | 'std' | 'stn' | 'svc' | 'syp' | 'szl' | 'thb' | 'tjs' | 'tmt' | 'tnd' | 'top' | 'try' | 'ttd' | 'twd' | 'tzs' | 'uah' | 'ugx' | 'uyu' | 'uzs' | 'vef' | 'vnd' | 'vuv' | 'wst' | 'xaf' | 'xag' | 'xau' | 'xcd' | 'xdr' | 'xof' | 'xpd' | 'xpf' | 'xpt' | 'yer' | 'zar' | 'zmw' | 'zwl' | Expression<string>;
/**
 * The pipeline ID of the deal
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 */
		group?: string | Expression<string>;
/**
 * The stage ID of the deal
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 */
		stage?: string | Expression<string>;
/**
 * The owner ID of the deal
 * @displayOptions.show { operation: ["create"], resource: ["deal"] }
 */
		owner?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a deal note */
export type ActiveCampaignV1DealCreateNoteConfig = {
	resource: 'deal';
	operation: 'createNote';
/**
 * The ID of the deal note
 * @displayOptions.show { operation: ["createNote"], resource: ["deal"] }
 */
		dealId: number | Expression<number>;
/**
 * The content of the deal note
 * @displayOptions.show { operation: ["createNote"], resource: ["deal"] }
 */
		dealNote: string | Expression<string>;
};

/** Delete an account */
export type ActiveCampaignV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
/**
 * The ID of the deal to delete
 * @displayOptions.show { operation: ["delete"], resource: ["deal"] }
 * @default 0
 */
		dealId: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
/**
 * The ID of the deal to get
 * @displayOptions.show { operation: ["get"], resource: ["deal"] }
 * @default 0
 */
		dealId: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["deal"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["deal"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["deal"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Update an account */
export type ActiveCampaignV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
/**
 * ID of the deal to update
 * @displayOptions.show { operation: ["update"], resource: ["deal"] }
 * @default 0
 */
		dealId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["deal"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Update a deal note */
export type ActiveCampaignV1DealUpdateNoteConfig = {
	resource: 'deal';
	operation: 'updateNote';
/**
 * The ID of the deal note
 * @displayOptions.show { operation: ["updateNote"], resource: ["deal"] }
 */
		dealId: number | Expression<number>;
/**
 * The ID of the deal note
 * @displayOptions.show { operation: ["updateNote"], resource: ["deal"] }
 */
		dealNoteId: number | Expression<number>;
/**
 * The content of the deal note
 * @displayOptions.show { operation: ["updateNote"], resource: ["deal"] }
 */
		dealNote?: string | Expression<string>;
};

/** Create an account */
export type ActiveCampaignV1EcommerceCustomerCreateConfig = {
	resource: 'ecommerceCustomer';
	operation: 'create';
/**
 * The ID of the connection object for the service where the customer originates
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceCustomer"] }
 */
		connectionid: string | Expression<string>;
/**
 * The ID of the customer in the external service
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceCustomer"] }
 */
		externalid: string | Expression<string>;
/**
 * The email address of the customer
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceCustomer"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ActiveCampaignV1EcommerceCustomerDeleteConfig = {
	resource: 'ecommerceCustomer';
	operation: 'delete';
/**
 * ID of the E-commerce customer to delete
 * @displayOptions.show { operation: ["delete"], resource: ["ecommerceCustomer"] }
 * @default 0
 */
		ecommerceCustomerId: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1EcommerceCustomerGetConfig = {
	resource: 'ecommerceCustomer';
	operation: 'get';
/**
 * ID of the E-commerce customer to get
 * @displayOptions.show { operation: ["get"], resource: ["ecommerceCustomer"] }
 * @default 0
 */
		ecommerceCustomerId: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1EcommerceCustomerGetAllConfig = {
	resource: 'ecommerceCustomer';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceCustomer"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceCustomer"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceCustomer"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Update an account */
export type ActiveCampaignV1EcommerceCustomerUpdateConfig = {
	resource: 'ecommerceCustomer';
	operation: 'update';
/**
 * ID of the E-commerce customer to update
 * @displayOptions.show { operation: ["update"], resource: ["ecommerceCustomer"] }
 * @default 0
 */
		ecommerceCustomerId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["ecommerceCustomer"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Create an account */
export type ActiveCampaignV1EcommerceOrderCreateConfig = {
	resource: 'ecommerceOrder';
	operation: 'create';
/**
 * The ID of the order in the external service. ONLY REQUIRED IF EXTERNALCHECKOUTID NOT INCLUDED.
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 */
		externalid?: string | Expression<string>;
/**
 * The ID of the cart in the external service. ONLY REQUIRED IF EXTERNALID IS NOT INCLUDED.
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 */
		externalcheckoutid?: string | Expression<string>;
/**
 * The order source code (0 - will not trigger automations, 1 - will trigger automations)
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		source: number | Expression<number>;
/**
 * The email address of the customer who placed the order
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 */
		email: string | Expression<string>;
/**
 * The total price of the order in cents, including tax and shipping charges. (i.e. $456.78 =&gt; 45678). Must be greater than or equal to zero.
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		totalPrice: number | Expression<number>;
/**
 * The currency of the order (3-digit ISO code, e.g., "USD")
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 * @default eur
 */
		currency: 'eur' | 'usd' | 'gbp' | 'chf' | 'cny' | '' | 'aed' | 'afn' | 'all' | 'amd' | 'ang' | 'aoa' | 'ars' | 'aud' | 'awg' | 'azn' | 'bam' | 'bbd' | 'bdt' | 'bgn' | 'bhd' | 'bif' | 'bmd' | 'bnd' | 'bob' | 'brl' | 'bsd' | 'btc' | 'btn' | 'bwp' | 'byn' | 'bzd' | 'cad' | 'cdf' | 'clf' | 'clp' | 'cnh' | 'cop' | 'crc' | 'cuc' | 'cup' | 'cve' | 'czk' | 'djf' | 'dkk' | 'dop' | 'dzd' | 'egp' | 'ern' | 'etb' | 'fjd' | 'fkp' | 'gel' | 'ggp' | 'ghs' | 'gip' | 'gmd' | 'gnf' | 'gtq' | 'gyd' | 'hkd' | 'hnl' | 'hrk' | 'htg' | 'huf' | 'idr' | 'ils' | 'imp' | 'inr' | 'iqd' | 'irr' | 'isk' | 'jep' | 'jmd' | 'jod' | 'jpy' | 'kes' | 'kgs' | 'khr' | 'kmf' | 'kpw' | 'krw' | 'kwd' | 'kyd' | 'kzt' | 'lak' | 'lbp' | 'lkr' | 'lrd' | 'lsl' | 'lyd' | 'mad' | 'mdl' | 'mga' | 'mkd' | 'mmk' | 'mnt' | 'mop' | 'mro' | 'mru' | 'mur' | 'mvr' | 'mwk' | 'mxn' | 'myr' | 'mzn' | 'nad' | 'ngn' | 'nio' | 'nok' | 'npr' | 'nzd' | 'omr' | 'pab' | 'pen' | 'pgk' | 'php' | 'pkr' | 'pln' | 'pyg' | 'qar' | 'ron' | 'rsd' | 'rub' | 'rwf' | 'sar' | 'sbd' | 'scr' | 'sdg' | 'sek' | 'sgd' | 'shp' | 'sll' | 'sos' | 'srd' | 'ssp' | 'std' | 'stn' | 'svc' | 'syp' | 'szl' | 'thb' | 'tjs' | 'tmt' | 'tnd' | 'top' | 'try' | 'ttd' | 'twd' | 'tzs' | 'uah' | 'ugx' | 'uyu' | 'uzs' | 'vef' | 'vnd' | 'vuv' | 'wst' | 'xaf' | 'xag' | 'xau' | 'xcd' | 'xdr' | 'xof' | 'xpd' | 'xpf' | 'xpt' | 'yer' | 'zar' | 'zmw' | 'zwl' | Expression<string>;
/**
 * The ID of the connection from which this order originated
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		connectionid: number | Expression<number>;
/**
 * The ID of the customer associated with this order
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		customerid: number | Expression<number>;
/**
 * The date the order was placed
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 */
		externalCreatedDate: string | Expression<string>;
/**
 * The date the cart was abandoned. REQUIRED ONLY IF INCLUDING EXTERNALCHECKOUTID.
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 */
		abandonedDate?: string | Expression<string>;
/**
 * All ordered products
 * @displayOptions.show { operation: ["create"], resource: ["ecommerceOrder"] }
 * @default {}
 */
		orderProducts?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ActiveCampaignV1EcommerceOrderDeleteConfig = {
	resource: 'ecommerceOrder';
	operation: 'delete';
/**
 * The ID of the e-commerce order
 * @displayOptions.show { operation: ["delete"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		orderId?: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1EcommerceOrderGetConfig = {
	resource: 'ecommerceOrder';
	operation: 'get';
/**
 * The ID of the e-commerce order
 * @displayOptions.show { operation: ["get"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		orderId?: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1EcommerceOrderGetAllConfig = {
	resource: 'ecommerceOrder';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrder"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrder"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrder"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Update an account */
export type ActiveCampaignV1EcommerceOrderUpdateConfig = {
	resource: 'ecommerceOrder';
	operation: 'update';
/**
 * The ID of the e-commerce order
 * @displayOptions.show { operation: ["update"], resource: ["ecommerceOrder"] }
 * @default 0
 */
		orderId?: number | Expression<number>;
	updateFields?: Record<string, unknown>;
};

/** Get data of many accounts */
export type ActiveCampaignV1EcommerceOrderProductsGetAllConfig = {
	resource: 'ecommerceOrderProducts';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrderProducts"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrderProducts"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["ecommerceOrderProducts"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Get data of a ordered product */
export type ActiveCampaignV1EcommerceOrderProductsGetByProductIdConfig = {
	resource: 'ecommerceOrderProducts';
	operation: 'getByProductId';
/**
 * The ID of the product you'd like returned
 * @displayOptions.show { operation: ["getByProductId"], resource: ["ecommerceOrderProducts"] }
 * @default 0
 */
		procuctId?: number | Expression<number>;
};

/** Get data of an order's products */
export type ActiveCampaignV1EcommerceOrderProductsGetByOrderIdConfig = {
	resource: 'ecommerceOrderProducts';
	operation: 'getByOrderId';
/**
 * The ID of the order whose products you'd like returned
 * @displayOptions.show { operation: ["getByOrderId"], resource: ["ecommerceOrderProducts"] }
 * @default 0
 */
		orderId?: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["list"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["list"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["list"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Create an account */
export type ActiveCampaignV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
/**
 * Tag-type of the new tag
 * @displayOptions.show { operation: ["create"], resource: ["tag"] }
 * @default contact
 */
		tagType: 'contact' | 'template' | Expression<string>;
/**
 * Name of the new tag
 * @displayOptions.show { operation: ["create"], resource: ["tag"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type ActiveCampaignV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
/**
 * ID of the tag to delete
 * @displayOptions.show { operation: ["delete"], resource: ["tag"] }
 * @default 0
 */
		tagId: number | Expression<number>;
};

/** Get data of an account */
export type ActiveCampaignV1TagGetConfig = {
	resource: 'tag';
	operation: 'get';
/**
 * ID of the tag to get
 * @displayOptions.show { operation: ["get"], resource: ["tag"] }
 * @default 0
 */
		tagId: number | Expression<number>;
};

/** Get data of many accounts */
export type ActiveCampaignV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
};

/** Update an account */
export type ActiveCampaignV1TagUpdateConfig = {
	resource: 'tag';
	operation: 'update';
/**
 * ID of the tag to update
 * @displayOptions.show { operation: ["update"], resource: ["tag"] }
 * @default 0
 */
		tagId: number | Expression<number>;
/**
 * The fields to update
 * @displayOptions.show { operation: ["update"], resource: ["tag"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ActiveCampaignV1AccountGetOutput = {
	account?: {
		accountUrl?: string;
		createdTimestamp?: string;
		updatedTimestamp?: string;
		id?: string;
		links?: {
			accountContacts?: string;
			accountCustomFieldData?: string;
			contactEmails?: string;
			emailActivities?: string;
			notes?: string;
			owner?: string;
		};
		name?: string;
		owner?: string;
	};
};

export type ActiveCampaignV1AccountGetAllOutput = {
	contactCount?: string;
	createdTimestamp?: string;
	dealCount?: string;
	id?: string;
	links?: {
		accountContacts?: string;
		accountCustomFieldData?: string;
		contactEmails?: string;
		emailActivities?: string;
		notes?: string;
		owner?: string;
	};
	name?: string;
	owner?: string;
	updatedTimestamp?: string;
};

export type ActiveCampaignV1ContactCreateOutput = {
	anonymized?: string;
	bounced_hard?: string;
	bounced_soft?: string;
	cdate?: string;
	created_timestamp?: string;
	created_utc_timestamp?: string;
	deleted?: string;
	email?: string;
	email_domain?: string;
	email_local?: string;
	fieldValues?: Array<string>;
	firstName?: string;
	gravatar?: string;
	hash?: string;
	id?: string;
	ip?: string;
	lastName?: string;
	links?: {
		automationEntryCounts?: string;
		bounceLogs?: string;
		contactAutomations?: string;
		contactData?: string;
		contactDeals?: string;
		contactGoals?: string;
		contactLists?: string;
		contactLogs?: string;
		contactTags?: string;
		deals?: string;
		fieldValues?: string;
		geoIps?: string;
		notes?: string;
		organization?: string;
		plusAppend?: string;
		scoreValues?: string;
		trackingLogs?: string;
	};
	mpp_tracking?: string;
	orgid?: string;
	orgname?: string;
	phone?: string;
	segmentio_id?: string;
	sentcnt?: string;
	socialdata_lastcheck?: null;
	udate?: string;
	updated_timestamp?: string;
	updated_utc_timestamp?: string;
};

export type ActiveCampaignV1ContactGetOutput = {
	accountContacts?: Array<{
		account?: string;
		contact?: string;
		createdTimestamp?: string;
		id?: string;
		jobTitle?: string;
		links?: {
			account?: string;
			contact?: string;
		};
		updatedTimestamp?: string;
	}>;
	contact?: {
		accountContacts?: Array<string>;
		anonymized?: string;
		bounced_hard?: string;
		bounced_soft?: string;
		cdate?: string;
		contactAutomations?: Array<string>;
		contactData?: string;
		contactLists?: Array<string>;
		created_timestamp?: string;
		created_utc_timestamp?: string;
		deals?: Array<string>;
		deleted?: string;
		deleted_at?: null;
		email?: string;
		email_domain?: string;
		email_local?: string;
		fieldValues?: Array<string>;
		firstName?: string;
		geoIps?: Array<string>;
		gravatar?: string;
		hash?: string;
		id?: string;
		ip?: string;
		lastName?: string;
		links?: {
			accountContacts?: string;
			automationEntryCounts?: string;
			bounceLogs?: string;
			contactAutomations?: string;
			contactData?: string;
			contactDeals?: string;
			contactGoals?: string;
			contactLists?: string;
			contactLogs?: string;
			contactTags?: string;
			deals?: string;
			fieldValues?: string;
			geoIps?: string;
			notes?: string;
			organization?: string;
			plusAppend?: string;
			scoreValues?: string;
			trackingLogs?: string;
		};
		mpp_tracking?: string;
		orgid?: string;
		orgname?: string;
		phone?: string;
		segmentio_id?: string;
		sentcnt?: string;
		socialdata_lastcheck?: null;
		udate?: string;
		updated_timestamp?: string;
		updated_utc_timestamp?: string;
	};
	contactAutomations?: Array<{
		adddate?: string;
		automation?: string;
		completed?: number;
		completedElements?: number;
		completeValue?: number;
		contact?: string;
		id?: string;
		lastblock?: string;
		lastdate?: string;
		lastlogid?: string;
		links?: {
			automation?: string;
			automationLogs?: string;
			contact?: string;
			contactGoals?: string;
		};
		seriesid?: string;
		startid?: string;
		status?: string;
		totalElements?: number;
	}>;
	contactData?: Array<{
		contact?: string;
		created_timestamp?: string;
		fb_id?: string;
		fb_name?: string;
		ga_campaign_content?: string;
		ga_campaign_customsegment?: string;
		ga_campaign_medium?: string;
		ga_campaign_name?: string;
		ga_campaign_source?: string;
		ga_campaign_term?: string;
		ga_first_visit?: null;
		ga_times_visited?: string;
		geo_country?: string;
		geoArea?: string;
		geoCity?: string;
		geoCountry2?: string;
		geoIp4?: string;
		geoLat?: string;
		geoLon?: string;
		geoState?: string;
		geoTz?: string;
		geoTzOffset?: string;
		geoZip?: string;
		id?: string;
		tstamp?: string;
		tw_id?: string;
		updated_timestamp?: string;
	}>;
	contactLists?: Array<{
		autosyncLog?: null;
		contact?: string;
		created_timestamp?: string;
		first_name?: string;
		id?: string;
		ip4_last?: string;
		ip4Sub?: string;
		ip4Unsub?: string;
		last_name?: string;
		links?: {
			automation?: string;
			autosyncLog?: string;
			campaign?: string;
			contact?: string;
			form?: string;
			list?: string;
			message?: string;
			unsubscribeAutomation?: string;
		};
		list?: string;
		message?: null;
		responder?: string;
		sdate?: string;
		seriesid?: string;
		sourceid?: string;
		status?: string;
		sync?: string;
		updated_timestamp?: string;
	}>;
	deals?: Array<{
		activitycount?: string;
		cdate?: string;
		contact?: string;
		currency?: string;
		description?: string;
		group?: string;
		hash?: string;
		id?: string;
		isDisabled?: boolean;
		links?: {
			account?: string;
			contact?: string;
			contactDeals?: string;
			customerAccount?: string;
			dealActivities?: string;
			dealCustomFieldData?: string;
			group?: string;
			nextTask?: string;
			notes?: string;
			organization?: string;
			owner?: string;
			scoreValues?: string;
			stage?: string;
			tasks?: string;
		};
		mdate?: string;
		nextdealid?: string;
		owner?: string;
		percent?: string;
		stage?: string;
		status?: string;
		title?: string;
		value?: string;
		winProbability?: null;
	}>;
	fieldValues?: Array<{
		cdate?: string;
		contact?: string;
		id?: string;
		links?: {
			field?: string;
			owner?: string;
		};
		owner?: string;
		udate?: string;
		value?: string;
	}>;
	geoIps?: Array<{
		campaignid?: string;
		contact?: string;
		geoAddress?: string;
		geoaddrid?: string;
		id?: string;
		ip4?: string;
		links?: {
			geoAddress?: string;
		};
		messageid?: string;
		tstamp?: string;
	}>;
};

export type ActiveCampaignV1ContactGetAllOutput = {
	anonymized?: string;
	bounced_hard?: string;
	bounced_soft?: string;
	created_timestamp?: string;
	created_utc_timestamp?: string;
	deleted?: string;
	deleted_at?: null;
	email?: string;
	email_domain?: string;
	email_local?: string;
	firstName?: string;
	gravatar?: string;
	hash?: string;
	id?: string;
	ip?: string;
	lastName?: string;
	links?: {
		accountContacts?: string;
		automationEntryCounts?: string;
		bounceLogs?: string;
		contactAutomations?: string;
		contactData?: string;
		contactDeals?: string;
		contactGoals?: string;
		contactLists?: string;
		contactLogs?: string;
		contactTags?: string;
		deals?: string;
		fieldValues?: string;
		geoIps?: string;
		notes?: string;
		organization?: string;
		plusAppend?: string;
		scoreValues?: string;
		trackingLogs?: string;
	};
	mpp_tracking?: string;
	orgid?: string;
	orgname?: string;
	phone?: string;
	segmentio_id?: string;
	sentcnt?: string;
	socialdata_lastcheck?: null;
	udate?: string;
	updated_timestamp?: string;
	updated_utc_timestamp?: string;
};

export type ActiveCampaignV1ContactUpdateOutput = {
	anonymized?: string;
	bounced_hard?: string;
	bounced_soft?: string;
	cdate?: string;
	created_timestamp?: string;
	created_utc_timestamp?: string;
	deleted?: string;
	deleted_at?: null;
	email?: string;
	email_domain?: string;
	email_local?: string;
	fieldValues?: Array<string>;
	firstName?: string;
	gravatar?: string;
	hash?: string;
	id?: string;
	ip?: string;
	lastName?: string;
	links?: {
		accountContacts?: string;
		automationEntryCounts?: string;
		bounceLogs?: string;
		contactAutomations?: string;
		contactData?: string;
		contactDeals?: string;
		contactGoals?: string;
		contactLists?: string;
		contactLogs?: string;
		contactTags?: string;
		deals?: string;
		fieldValues?: string;
		geoIps?: string;
		notes?: string;
		organization?: string;
		plusAppend?: string;
		scoreValues?: string;
		trackingLogs?: string;
	};
	mpp_tracking?: string;
	orgid?: string;
	orgname?: string;
	phone?: string;
	segmentio_id?: string;
	sentcnt?: string;
	socialdata_lastcheck?: null;
	udate?: string;
	updated_timestamp?: string;
	updated_utc_timestamp?: string;
};

export type ActiveCampaignV1ContactListAddOutput = {
	success?: boolean;
};

export type ActiveCampaignV1ContactTagAddOutput = {
	cdate?: string;
	created_by?: null;
	created_timestamp?: string;
	id?: string;
	links?: {
		contact?: string;
		tag?: string;
	};
	updated_by?: null;
	updated_timestamp?: string;
};

export type ActiveCampaignV1DealCreateOutput = {
	contacts?: Array<{
		anonymized?: string;
		bounced_date?: null;
		bounced_hard?: string;
		bounced_soft?: string;
		cdate?: string;
		created_timestamp?: string;
		created_utc_timestamp?: string;
		deleted?: string;
		deleted_at?: null;
		email?: string;
		email_domain?: string;
		email_local?: string;
		firstName?: string;
		gravatar?: string;
		hash?: string;
		id?: string;
		ip?: string;
		last_mpp_open_date?: null;
		lastName?: string;
		links?: {
			accountContacts?: string;
			automationEntryCounts?: string;
			bounceLogs?: string;
			contactAutomations?: string;
			contactData?: string;
			contactDeals?: string;
			contactGoals?: string;
			contactLists?: string;
			contactLogs?: string;
			contactTags?: string;
			deals?: string;
			fieldValues?: string;
			geoIps?: string;
			notes?: string;
			organization?: string;
			plusAppend?: string;
			scoreValues?: string;
			trackingLogs?: string;
		};
		mpp_tracking?: string;
		organization?: null;
		orgid?: string;
		orgname?: string;
		phone?: string;
		segmentio_id?: string;
		sentcnt?: string;
		socialdata_lastcheck?: null;
		udate?: string;
		updated_timestamp?: string;
		updated_utc_timestamp?: string;
	}>;
	deal?: {
		account?: null;
		cdate?: string;
		contact?: string;
		currency?: string;
		customerAccount?: null;
		description?: string;
		hash?: string;
		id?: string;
		isDisabled?: boolean;
		links?: {
			account?: string;
			contact?: string;
			contactDeals?: string;
			customerAccount?: string;
			dealActivities?: string;
			dealCustomFieldData?: string;
			group?: string;
			nextTask?: string;
			notes?: string;
			organization?: string;
			owner?: string;
			scoreValues?: string;
			stage?: string;
			tasks?: string;
		};
		mdate?: string;
		nextdate?: null;
		nextdealid?: string;
		organization?: null;
		status?: number;
		title?: string;
		winProbability?: null;
		winProbabilityMdate?: null;
	};
	dealGroups?: Array<{
		allgroups?: string;
		allusers?: string;
		autoassign?: string;
		cdate?: string;
		currency?: string;
		id?: string;
		links?: {
			dealGroupGroups?: string;
			dealGroupUsers?: string;
			stages?: string;
			winProbabilityFeatures?: string;
		};
		title?: string;
		udate?: string;
		win_probability_initialize_date?: null;
	}>;
	dealStages?: Array<{
		cardRegion1?: string;
		cardRegion2?: string;
		cardRegion3?: string;
		cardRegion4?: string;
		cardRegion5?: string;
		cdate?: null;
		color?: string;
		dealOrder?: string;
		group?: string;
		id?: string;
		links?: {
			group?: string;
		};
		order?: string;
		title?: string;
		width?: string;
	}>;
};

export type ActiveCampaignV1DealGetOutput = {
	deal?: {
		activitycount?: string;
		cdate?: string;
		currency?: string;
		description?: string;
		group?: string;
		hash?: string;
		id?: string;
		isDisabled?: boolean;
		links?: {
			account?: string;
			contact?: string;
			contactDeals?: string;
			customerAccount?: string;
			dealActivities?: string;
			dealCustomFieldData?: string;
			group?: string;
			nextTask?: string;
			notes?: string;
			organization?: string;
			owner?: string;
			scoreValues?: string;
			stage?: string;
			tasks?: string;
		};
		mdate?: string;
		nextdealid?: string;
		owner?: string;
		percent?: string;
		stage?: string;
		status?: string;
		title?: string;
		value?: string;
	};
};

export type ActiveCampaignV1DealGetAllOutput = {
	activitycount?: string;
	cdate?: string;
	currency?: string;
	description?: string;
	group?: string;
	hash?: string;
	id?: string;
	isDisabled?: boolean;
	links?: {
		account?: string;
		contact?: string;
		contactDeals?: string;
		customerAccount?: string;
		dealActivities?: string;
		dealCustomFieldData?: string;
		group?: string;
		nextTask?: string;
		notes?: string;
		organization?: string;
		owner?: string;
		scoreValues?: string;
		stage?: string;
		tasks?: string;
	};
	mdate?: string;
	nextdealid?: string;
	owner?: string;
	percent?: string;
	stage?: string;
	status?: string;
	title?: string;
	value?: string;
};

export type ActiveCampaignV1DealUpdateOutput = {
	deal?: {
		activitycount?: string;
		cdate?: string;
		contact?: string;
		currency?: string;
		description?: string;
		group?: string;
		hash?: string;
		id?: string;
		isDisabled?: boolean;
		links?: {
			account?: string;
			contact?: string;
			contactDeals?: string;
			customerAccount?: string;
			dealActivities?: string;
			dealCustomFieldData?: string;
			group?: string;
			nextTask?: string;
			notes?: string;
			organization?: string;
			owner?: string;
			scoreValues?: string;
			stage?: string;
			tasks?: string;
		};
		mdate?: string;
		nextdealid?: string;
		owner?: string;
		percent?: string;
		stage?: string;
		title?: string;
	};
	dealStages?: Array<{
		cardRegion1?: string;
		cardRegion2?: string;
		cardRegion3?: string;
		cardRegion4?: string;
		cardRegion5?: string;
		color?: string;
		dealOrder?: string;
		group?: string;
		id?: string;
		links?: {
			group?: string;
		};
		order?: string;
		title?: string;
		udate?: string;
		width?: string;
	}>;
};

export type ActiveCampaignV1ListGetAllOutput = {
	analytics_domains?: null;
	analytics_source?: string;
	analytics_ua?: string;
	cdate?: string;
	created_by?: null;
	created_timestamp?: string;
	deletestamp?: null;
	facebook_session?: null;
	get_unsubscribe_reason?: string;
	id?: string;
	links?: {
		addressLists?: string;
		contactGoalLists?: string;
		user?: string;
	};
	name?: string;
	optinmessageid?: string;
	optinoptout?: string;
	optoutconf?: string;
	p_embed_image?: string;
	p_use_analytics_link?: string;
	p_use_analytics_read?: string;
	p_use_captcha?: string;
	p_use_facebook?: string;
	p_use_tracking?: string;
	p_use_twitter?: string;
	private?: string;
	require_name?: string;
	send_last_broadcast?: string;
	sender_addr1?: string;
	sender_addr2?: string;
	sender_city?: string;
	sender_country?: string;
	sender_name?: string;
	sender_phone?: string;
	sender_reminder?: string;
	sender_state?: string;
	sender_url?: string;
	sender_zip?: string;
	stringid?: string;
	to_name?: string;
	twitter_token?: string;
	twitter_token_secret?: string;
	updated_by?: null;
	updated_timestamp?: string;
	user?: string;
	userid?: string;
};

export type ActiveCampaignV1TagGetOutput = {
	tag?: {
		created_timestamp?: string;
		deleted?: string;
		description?: string;
		id?: string;
		links?: {
			contactGoalTags?: string;
			templateTags?: string;
		};
		subscriber_count?: string;
		tag?: string;
		tagType?: string;
		updated_timestamp?: string;
	};
};

export type ActiveCampaignV1TagGetAllOutput = {
	created_timestamp?: string;
	deleted?: string;
	description?: string;
	id?: string;
	links?: {
		contactGoalTags?: string;
		templateTags?: string;
	};
	subscriber_count?: string;
	tag?: string;
	tagType?: string;
	updated_timestamp?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ActiveCampaignV1Credentials {
	activeCampaignApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ActiveCampaignV1NodeBase {
	type: 'n8n-nodes-base.activeCampaign';
	version: 1;
	credentials?: ActiveCampaignV1Credentials;
}

export type ActiveCampaignV1AccountCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountCreateConfig>;
};

export type ActiveCampaignV1AccountDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountDeleteConfig>;
};

export type ActiveCampaignV1AccountGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountGetConfig>;
	output?: ActiveCampaignV1AccountGetOutput;
};

export type ActiveCampaignV1AccountGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountGetAllConfig>;
	output?: ActiveCampaignV1AccountGetAllOutput;
};

export type ActiveCampaignV1AccountUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountUpdateConfig>;
};

export type ActiveCampaignV1AccountContactCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountContactCreateConfig>;
};

export type ActiveCampaignV1AccountContactDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountContactDeleteConfig>;
};

export type ActiveCampaignV1AccountContactUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1AccountContactUpdateConfig>;
};

export type ActiveCampaignV1ConnectionCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ConnectionCreateConfig>;
};

export type ActiveCampaignV1ConnectionDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ConnectionDeleteConfig>;
};

export type ActiveCampaignV1ConnectionGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ConnectionGetConfig>;
};

export type ActiveCampaignV1ConnectionGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ConnectionGetAllConfig>;
};

export type ActiveCampaignV1ConnectionUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ConnectionUpdateConfig>;
};

export type ActiveCampaignV1ContactCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactCreateConfig>;
	output?: ActiveCampaignV1ContactCreateOutput;
};

export type ActiveCampaignV1ContactDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactDeleteConfig>;
};

export type ActiveCampaignV1ContactGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactGetConfig>;
	output?: ActiveCampaignV1ContactGetOutput;
};

export type ActiveCampaignV1ContactGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactGetAllConfig>;
	output?: ActiveCampaignV1ContactGetAllOutput;
};

export type ActiveCampaignV1ContactUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactUpdateConfig>;
	output?: ActiveCampaignV1ContactUpdateOutput;
};

export type ActiveCampaignV1ContactListAddNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactListAddConfig>;
	output?: ActiveCampaignV1ContactListAddOutput;
};

export type ActiveCampaignV1ContactListRemoveNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactListRemoveConfig>;
};

export type ActiveCampaignV1ContactTagAddNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactTagAddConfig>;
	output?: ActiveCampaignV1ContactTagAddOutput;
};

export type ActiveCampaignV1ContactTagRemoveNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ContactTagRemoveConfig>;
};

export type ActiveCampaignV1DealCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealCreateConfig>;
	output?: ActiveCampaignV1DealCreateOutput;
};

export type ActiveCampaignV1DealCreateNoteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealCreateNoteConfig>;
};

export type ActiveCampaignV1DealDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealDeleteConfig>;
};

export type ActiveCampaignV1DealGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealGetConfig>;
	output?: ActiveCampaignV1DealGetOutput;
};

export type ActiveCampaignV1DealGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealGetAllConfig>;
	output?: ActiveCampaignV1DealGetAllOutput;
};

export type ActiveCampaignV1DealUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealUpdateConfig>;
	output?: ActiveCampaignV1DealUpdateOutput;
};

export type ActiveCampaignV1DealUpdateNoteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1DealUpdateNoteConfig>;
};

export type ActiveCampaignV1EcommerceCustomerCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceCustomerCreateConfig>;
};

export type ActiveCampaignV1EcommerceCustomerDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceCustomerDeleteConfig>;
};

export type ActiveCampaignV1EcommerceCustomerGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceCustomerGetConfig>;
};

export type ActiveCampaignV1EcommerceCustomerGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceCustomerGetAllConfig>;
};

export type ActiveCampaignV1EcommerceCustomerUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceCustomerUpdateConfig>;
};

export type ActiveCampaignV1EcommerceOrderCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderCreateConfig>;
};

export type ActiveCampaignV1EcommerceOrderDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderDeleteConfig>;
};

export type ActiveCampaignV1EcommerceOrderGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderGetConfig>;
};

export type ActiveCampaignV1EcommerceOrderGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderGetAllConfig>;
};

export type ActiveCampaignV1EcommerceOrderUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderUpdateConfig>;
};

export type ActiveCampaignV1EcommerceOrderProductsGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderProductsGetAllConfig>;
};

export type ActiveCampaignV1EcommerceOrderProductsGetByProductIdNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderProductsGetByProductIdConfig>;
};

export type ActiveCampaignV1EcommerceOrderProductsGetByOrderIdNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1EcommerceOrderProductsGetByOrderIdConfig>;
};

export type ActiveCampaignV1ListGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1ListGetAllConfig>;
	output?: ActiveCampaignV1ListGetAllOutput;
};

export type ActiveCampaignV1TagCreateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1TagCreateConfig>;
};

export type ActiveCampaignV1TagDeleteNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1TagDeleteConfig>;
};

export type ActiveCampaignV1TagGetNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1TagGetConfig>;
	output?: ActiveCampaignV1TagGetOutput;
};

export type ActiveCampaignV1TagGetAllNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1TagGetAllConfig>;
	output?: ActiveCampaignV1TagGetAllOutput;
};

export type ActiveCampaignV1TagUpdateNode = ActiveCampaignV1NodeBase & {
	config: NodeConfig<ActiveCampaignV1TagUpdateConfig>;
};

export type ActiveCampaignV1Node =
	| ActiveCampaignV1AccountCreateNode
	| ActiveCampaignV1AccountDeleteNode
	| ActiveCampaignV1AccountGetNode
	| ActiveCampaignV1AccountGetAllNode
	| ActiveCampaignV1AccountUpdateNode
	| ActiveCampaignV1AccountContactCreateNode
	| ActiveCampaignV1AccountContactDeleteNode
	| ActiveCampaignV1AccountContactUpdateNode
	| ActiveCampaignV1ConnectionCreateNode
	| ActiveCampaignV1ConnectionDeleteNode
	| ActiveCampaignV1ConnectionGetNode
	| ActiveCampaignV1ConnectionGetAllNode
	| ActiveCampaignV1ConnectionUpdateNode
	| ActiveCampaignV1ContactCreateNode
	| ActiveCampaignV1ContactDeleteNode
	| ActiveCampaignV1ContactGetNode
	| ActiveCampaignV1ContactGetAllNode
	| ActiveCampaignV1ContactUpdateNode
	| ActiveCampaignV1ContactListAddNode
	| ActiveCampaignV1ContactListRemoveNode
	| ActiveCampaignV1ContactTagAddNode
	| ActiveCampaignV1ContactTagRemoveNode
	| ActiveCampaignV1DealCreateNode
	| ActiveCampaignV1DealCreateNoteNode
	| ActiveCampaignV1DealDeleteNode
	| ActiveCampaignV1DealGetNode
	| ActiveCampaignV1DealGetAllNode
	| ActiveCampaignV1DealUpdateNode
	| ActiveCampaignV1DealUpdateNoteNode
	| ActiveCampaignV1EcommerceCustomerCreateNode
	| ActiveCampaignV1EcommerceCustomerDeleteNode
	| ActiveCampaignV1EcommerceCustomerGetNode
	| ActiveCampaignV1EcommerceCustomerGetAllNode
	| ActiveCampaignV1EcommerceCustomerUpdateNode
	| ActiveCampaignV1EcommerceOrderCreateNode
	| ActiveCampaignV1EcommerceOrderDeleteNode
	| ActiveCampaignV1EcommerceOrderGetNode
	| ActiveCampaignV1EcommerceOrderGetAllNode
	| ActiveCampaignV1EcommerceOrderUpdateNode
	| ActiveCampaignV1EcommerceOrderProductsGetAllNode
	| ActiveCampaignV1EcommerceOrderProductsGetByProductIdNode
	| ActiveCampaignV1EcommerceOrderProductsGetByOrderIdNode
	| ActiveCampaignV1ListGetAllNode
	| ActiveCampaignV1TagCreateNode
	| ActiveCampaignV1TagDeleteNode
	| ActiveCampaignV1TagGetNode
	| ActiveCampaignV1TagGetAllNode
	| ActiveCampaignV1TagUpdateNode
	;