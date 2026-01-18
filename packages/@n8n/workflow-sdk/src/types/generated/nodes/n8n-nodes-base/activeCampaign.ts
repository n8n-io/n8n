/**
 * ActiveCampaign Node Types
 *
 * Create and edit data in ActiveCampaign
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/activecampaign/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an account */
export type ActiveCampaignV1AccountCreateConfig = {
	resource: 'account';
	operation: 'create';
	/**
	 * Account's name
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default 0
	 */
	accountId: number | Expression<number>;
	/**
	 * The fields to update
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
	 */
	accountContactId: number | Expression<number>;
	/**
	 * The fields to update
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
	 */
	service: string | Expression<string>;
	/**
	 * The ID of the account in the external service
	 */
	externalid: string | Expression<string>;
	/**
	 * The name associated with the account in the external service. Often this will be a company name (e.g., "My Toystore, Inc.").
	 */
	name: string | Expression<string>;
	/**
	 * The URL to a logo image for the external service
	 */
	logoUrl: string | Expression<string>;
	/**
	 * The URL to a page where the integration with the external service can be managed in the third-party's website
	 */
	linkUrl: string | Expression<string>;
};

/** Delete an account */
export type ActiveCampaignV1ConnectionDeleteConfig = {
	resource: 'connection';
	operation: 'delete';
	/**
	 * ID of the connection to delete
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default 0
	 */
	connectionId: number | Expression<number>;
	/**
	 * The fields to update
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
	 */
	email: string | Expression<string>;
	/**
	 * Whether to update user if it exists already. If not set and user exists it will error instead.
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default 0
	 */
	contactId: number | Expression<number>;
	/**
	 * The fields to update
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
	 */
	title: string | Expression<string>;
	/**
	 * The ID of the deal's contact
	 * @default 0
	 */
	contact: number | Expression<number>;
	/**
	 * The value of the deal in cents
	 * @default 0
	 */
	value: number | Expression<number>;
	/**
	 * The currency of the deal in 3-character ISO format
	 * @default eur
	 */
	currency:
		| 'eur'
		| 'usd'
		| 'gbp'
		| 'chf'
		| 'cny'
		| ''
		| 'aed'
		| 'afn'
		| 'all'
		| 'amd'
		| 'ang'
		| 'aoa'
		| 'ars'
		| 'aud'
		| 'awg'
		| 'azn'
		| 'bam'
		| 'bbd'
		| 'bdt'
		| 'bgn'
		| 'bhd'
		| 'bif'
		| 'bmd'
		| 'bnd'
		| 'bob'
		| 'brl'
		| 'bsd'
		| 'btc'
		| 'btn'
		| 'bwp'
		| 'byn'
		| 'bzd'
		| 'cad'
		| 'cdf'
		| 'clf'
		| 'clp'
		| 'cnh'
		| 'cop'
		| 'crc'
		| 'cuc'
		| 'cup'
		| 'cve'
		| 'czk'
		| 'djf'
		| 'dkk'
		| 'dop'
		| 'dzd'
		| 'egp'
		| 'ern'
		| 'etb'
		| 'fjd'
		| 'fkp'
		| 'gel'
		| 'ggp'
		| 'ghs'
		| 'gip'
		| 'gmd'
		| 'gnf'
		| 'gtq'
		| 'gyd'
		| 'hkd'
		| 'hnl'
		| 'hrk'
		| 'htg'
		| 'huf'
		| 'idr'
		| 'ils'
		| 'imp'
		| 'inr'
		| 'iqd'
		| 'irr'
		| 'isk'
		| 'jep'
		| 'jmd'
		| 'jod'
		| 'jpy'
		| 'kes'
		| 'kgs'
		| 'khr'
		| 'kmf'
		| 'kpw'
		| 'krw'
		| 'kwd'
		| 'kyd'
		| 'kzt'
		| 'lak'
		| 'lbp'
		| 'lkr'
		| 'lrd'
		| 'lsl'
		| 'lyd'
		| 'mad'
		| 'mdl'
		| 'mga'
		| 'mkd'
		| 'mmk'
		| 'mnt'
		| 'mop'
		| 'mro'
		| 'mru'
		| 'mur'
		| 'mvr'
		| 'mwk'
		| 'mxn'
		| 'myr'
		| 'mzn'
		| 'nad'
		| 'ngn'
		| 'nio'
		| 'nok'
		| 'npr'
		| 'nzd'
		| 'omr'
		| 'pab'
		| 'pen'
		| 'pgk'
		| 'php'
		| 'pkr'
		| 'pln'
		| 'pyg'
		| 'qar'
		| 'ron'
		| 'rsd'
		| 'rub'
		| 'rwf'
		| 'sar'
		| 'sbd'
		| 'scr'
		| 'sdg'
		| 'sek'
		| 'sgd'
		| 'shp'
		| 'sll'
		| 'sos'
		| 'srd'
		| 'ssp'
		| 'std'
		| 'stn'
		| 'svc'
		| 'syp'
		| 'szl'
		| 'thb'
		| 'tjs'
		| 'tmt'
		| 'tnd'
		| 'top'
		| 'try'
		| 'ttd'
		| 'twd'
		| 'tzs'
		| 'uah'
		| 'ugx'
		| 'uyu'
		| 'uzs'
		| 'vef'
		| 'vnd'
		| 'vuv'
		| 'wst'
		| 'xaf'
		| 'xag'
		| 'xau'
		| 'xcd'
		| 'xdr'
		| 'xof'
		| 'xpd'
		| 'xpf'
		| 'xpt'
		| 'yer'
		| 'zar'
		| 'zmw'
		| 'zwl'
		| Expression<string>;
	/**
	 * The pipeline ID of the deal
	 */
	group?: string | Expression<string>;
	/**
	 * The stage ID of the deal
	 */
	stage?: string | Expression<string>;
	/**
	 * The owner ID of the deal
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
	 */
	dealId: number | Expression<number>;
	/**
	 * The content of the deal note
	 */
	dealNote: string | Expression<string>;
};

/** Delete an account */
export type ActiveCampaignV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	/**
	 * The ID of the deal to delete
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default 0
	 */
	dealId: number | Expression<number>;
	/**
	 * The fields to update
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
	 */
	dealId: number | Expression<number>;
	/**
	 * The ID of the deal note
	 */
	dealNoteId: number | Expression<number>;
	/**
	 * The content of the deal note
	 */
	dealNote?: string | Expression<string>;
};

/** Create an account */
export type ActiveCampaignV1EcommerceCustomerCreateConfig = {
	resource: 'ecommerceCustomer';
	operation: 'create';
	/**
	 * The ID of the connection object for the service where the customer originates
	 */
	connectionid: string | Expression<string>;
	/**
	 * The ID of the customer in the external service
	 */
	externalid: string | Expression<string>;
	/**
	 * The email address of the customer
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default 0
	 */
	ecommerceCustomerId: number | Expression<number>;
	/**
	 * The fields to update
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
	 */
	externalid?: string | Expression<string>;
	/**
	 * The ID of the cart in the external service. ONLY REQUIRED IF EXTERNALID IS NOT INCLUDED.
	 */
	externalcheckoutid?: string | Expression<string>;
	/**
	 * The order source code (0 - will not trigger automations, 1 - will trigger automations)
	 * @default 0
	 */
	source: number | Expression<number>;
	/**
	 * The email address of the customer who placed the order
	 */
	email: string | Expression<string>;
	/**
	 * The total price of the order in cents, including tax and shipping charges. (i.e. $456.78 =&gt; 45678). Must be greater than or equal to zero.
	 * @default 0
	 */
	totalPrice: number | Expression<number>;
	/**
	 * The currency of the order (3-digit ISO code, e.g., "USD")
	 * @default eur
	 */
	currency:
		| 'eur'
		| 'usd'
		| 'gbp'
		| 'chf'
		| 'cny'
		| ''
		| 'aed'
		| 'afn'
		| 'all'
		| 'amd'
		| 'ang'
		| 'aoa'
		| 'ars'
		| 'aud'
		| 'awg'
		| 'azn'
		| 'bam'
		| 'bbd'
		| 'bdt'
		| 'bgn'
		| 'bhd'
		| 'bif'
		| 'bmd'
		| 'bnd'
		| 'bob'
		| 'brl'
		| 'bsd'
		| 'btc'
		| 'btn'
		| 'bwp'
		| 'byn'
		| 'bzd'
		| 'cad'
		| 'cdf'
		| 'clf'
		| 'clp'
		| 'cnh'
		| 'cop'
		| 'crc'
		| 'cuc'
		| 'cup'
		| 'cve'
		| 'czk'
		| 'djf'
		| 'dkk'
		| 'dop'
		| 'dzd'
		| 'egp'
		| 'ern'
		| 'etb'
		| 'fjd'
		| 'fkp'
		| 'gel'
		| 'ggp'
		| 'ghs'
		| 'gip'
		| 'gmd'
		| 'gnf'
		| 'gtq'
		| 'gyd'
		| 'hkd'
		| 'hnl'
		| 'hrk'
		| 'htg'
		| 'huf'
		| 'idr'
		| 'ils'
		| 'imp'
		| 'inr'
		| 'iqd'
		| 'irr'
		| 'isk'
		| 'jep'
		| 'jmd'
		| 'jod'
		| 'jpy'
		| 'kes'
		| 'kgs'
		| 'khr'
		| 'kmf'
		| 'kpw'
		| 'krw'
		| 'kwd'
		| 'kyd'
		| 'kzt'
		| 'lak'
		| 'lbp'
		| 'lkr'
		| 'lrd'
		| 'lsl'
		| 'lyd'
		| 'mad'
		| 'mdl'
		| 'mga'
		| 'mkd'
		| 'mmk'
		| 'mnt'
		| 'mop'
		| 'mro'
		| 'mru'
		| 'mur'
		| 'mvr'
		| 'mwk'
		| 'mxn'
		| 'myr'
		| 'mzn'
		| 'nad'
		| 'ngn'
		| 'nio'
		| 'nok'
		| 'npr'
		| 'nzd'
		| 'omr'
		| 'pab'
		| 'pen'
		| 'pgk'
		| 'php'
		| 'pkr'
		| 'pln'
		| 'pyg'
		| 'qar'
		| 'ron'
		| 'rsd'
		| 'rub'
		| 'rwf'
		| 'sar'
		| 'sbd'
		| 'scr'
		| 'sdg'
		| 'sek'
		| 'sgd'
		| 'shp'
		| 'sll'
		| 'sos'
		| 'srd'
		| 'ssp'
		| 'std'
		| 'stn'
		| 'svc'
		| 'syp'
		| 'szl'
		| 'thb'
		| 'tjs'
		| 'tmt'
		| 'tnd'
		| 'top'
		| 'try'
		| 'ttd'
		| 'twd'
		| 'tzs'
		| 'uah'
		| 'ugx'
		| 'uyu'
		| 'uzs'
		| 'vef'
		| 'vnd'
		| 'vuv'
		| 'wst'
		| 'xaf'
		| 'xag'
		| 'xau'
		| 'xcd'
		| 'xdr'
		| 'xof'
		| 'xpd'
		| 'xpf'
		| 'xpt'
		| 'yer'
		| 'zar'
		| 'zmw'
		| 'zwl'
		| Expression<string>;
	/**
	 * The ID of the connection from which this order originated
	 * @default 0
	 */
	connectionid: number | Expression<number>;
	/**
	 * The ID of the customer associated with this order
	 * @default 0
	 */
	customerid: number | Expression<number>;
	/**
	 * The date the order was placed
	 */
	externalCreatedDate: string | Expression<string>;
	/**
	 * The date the cart was abandoned. REQUIRED ONLY IF INCLUDING EXTERNALCHECKOUTID.
	 */
	abandonedDate?: string | Expression<string>;
	/**
	 * All ordered products
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default contact
	 */
	tagType: 'contact' | 'template' | Expression<string>;
	/**
	 * Name of the new tag
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default 0
	 */
	tagId: number | Expression<number>;
	/**
	 * The fields to update
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
	| ActiveCampaignV1TagUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ActiveCampaignV1Credentials {
	activeCampaignApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ActiveCampaignV1Node = {
	type: 'n8n-nodes-base.activeCampaign';
	version: 1;
	config: NodeConfig<ActiveCampaignV1Params>;
	credentials?: ActiveCampaignV1Credentials;
};

export type ActiveCampaignNode = ActiveCampaignV1Node;
