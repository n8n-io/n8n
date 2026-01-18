/**
 * ActiveCampaign Node - Version 1
 * Create and edit data in ActiveCampaign
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type ActiveCampaignV1Params =
	| ActiveCampaignV1AccountCreateConfig
	| ActiveCampaignV1AccountDeleteConfig
	| ActiveCampaignV1AccountGetConfig
	| ActiveCampaignV1AccountGetAllConfig
	| ActiveCampaignV1AccountUpdateConfig
	| ActiveCampaignV1AccountContactCreateConfig
	| ActiveCampaignV1AccountContactDeleteConfig
	| ActiveCampaignV1AccountContactUpdateConfig
	| ActiveCampaignV1ConnectionCreateConfig
	| ActiveCampaignV1ConnectionDeleteConfig
	| ActiveCampaignV1ConnectionGetConfig
	| ActiveCampaignV1ConnectionGetAllConfig
	| ActiveCampaignV1ConnectionUpdateConfig
	| ActiveCampaignV1ContactCreateConfig
	| ActiveCampaignV1ContactDeleteConfig
	| ActiveCampaignV1ContactGetConfig
	| ActiveCampaignV1ContactGetAllConfig
	| ActiveCampaignV1ContactUpdateConfig
	| ActiveCampaignV1ContactListAddConfig
	| ActiveCampaignV1ContactListRemoveConfig
	| ActiveCampaignV1ContactTagAddConfig
	| ActiveCampaignV1ContactTagRemoveConfig
	| ActiveCampaignV1DealCreateConfig
	| ActiveCampaignV1DealCreateNoteConfig
	| ActiveCampaignV1DealDeleteConfig
	| ActiveCampaignV1DealGetConfig
	| ActiveCampaignV1DealGetAllConfig
	| ActiveCampaignV1DealUpdateConfig
	| ActiveCampaignV1DealUpdateNoteConfig
	| ActiveCampaignV1EcommerceCustomerCreateConfig
	| ActiveCampaignV1EcommerceCustomerDeleteConfig
	| ActiveCampaignV1EcommerceCustomerGetConfig
	| ActiveCampaignV1EcommerceCustomerGetAllConfig
	| ActiveCampaignV1EcommerceCustomerUpdateConfig
	| ActiveCampaignV1EcommerceOrderCreateConfig
	| ActiveCampaignV1EcommerceOrderDeleteConfig
	| ActiveCampaignV1EcommerceOrderGetConfig
	| ActiveCampaignV1EcommerceOrderGetAllConfig
	| ActiveCampaignV1EcommerceOrderUpdateConfig
	| ActiveCampaignV1EcommerceOrderProductsGetAllConfig
	| ActiveCampaignV1EcommerceOrderProductsGetByProductIdConfig
	| ActiveCampaignV1EcommerceOrderProductsGetByOrderIdConfig
	| ActiveCampaignV1ListGetAllConfig
	| ActiveCampaignV1TagCreateConfig
	| ActiveCampaignV1TagDeleteConfig
	| ActiveCampaignV1TagGetConfig
	| ActiveCampaignV1TagGetAllConfig
	| ActiveCampaignV1TagUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ActiveCampaignV1Credentials {
	activeCampaignApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ActiveCampaignV1Node = {
	type: 'n8n-nodes-base.activeCampaign';
	version: 1;
	config: NodeConfig<ActiveCampaignV1Params>;
	credentials?: ActiveCampaignV1Credentials;
};