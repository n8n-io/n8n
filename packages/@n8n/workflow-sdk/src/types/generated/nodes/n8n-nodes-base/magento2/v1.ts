/**
 * Magento 2 Node - Version 1
 * Consume Magento API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new customer */
export type Magento2V1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
/**
 * Email address of the user to create
 * @displayOptions.show { resource: ["customer"], operation: ["create"] }
 */
		email: string | Expression<string>;
/**
 * First name of the user to create
 * @displayOptions.show { resource: ["customer"], operation: ["create"] }
 */
		firstname: string | Expression<string>;
/**
 * Last name of the user to create
 * @displayOptions.show { resource: ["customer"], operation: ["create"] }
 */
		lastname: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a customer */
export type Magento2V1CustomerDeleteConfig = {
	resource: 'customer';
	operation: 'delete';
	customerId: string | Expression<string>;
};

/** Get a customer */
export type Magento2V1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
	customerId: string | Expression<string>;
};

/** Get many customers */
export type Magento2V1CustomerGetAllConfig = {
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
 * @default 5
 */
		limit?: number | Expression<number>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	filters?: {
		conditions?: Array<{
			/** Field
			 */
			field?: string | Expression<string>;
			/** Condition Type
			 * @default eq
			 */
			condition_type?: 'eq' | 'gt' | 'gteq' | 'in' | 'lt' | 'lte' | 'like' | 'moreq' | 'neq' | 'nin' | 'notnull' | 'null' | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition_type: ["null", "notnull"] }
			 */
			value?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update a customer */
export type Magento2V1CustomerUpdateConfig = {
	resource: 'customer';
	operation: 'update';
/**
 * ID of the customer to update
 * @displayOptions.show { resource: ["customer"], operation: ["update"] }
 */
		customerId?: string | Expression<string>;
	email?: string | Expression<string>;
	firstName?: string | Expression<string>;
	lastName?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["customer"], operation: ["update"] }
 */
		website_id?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new customer */
export type Magento2V1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
	orderId: string | Expression<string>;
};

/** Cancel an order */
export type Magento2V1OrderCancelConfig = {
	resource: 'order';
	operation: 'cancel';
	orderId: string | Expression<string>;
};

/** Get a customer */
export type Magento2V1OrderGetConfig = {
	resource: 'order';
	operation: 'get';
	orderId: string | Expression<string>;
};

/** Get many customers */
export type Magento2V1OrderGetAllConfig = {
	resource: 'order';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["order"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["order"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	filters?: {
		conditions?: Array<{
			/** Field
			 */
			field?: string | Expression<string>;
			/** Condition Type
			 * @default eq
			 */
			condition_type?: 'eq' | 'gt' | 'gteq' | 'in' | 'lt' | 'lte' | 'like' | 'moreq' | 'neq' | 'nin' | 'notnull' | 'null' | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition_type: ["null", "notnull"] }
			 */
			value?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Ship an order */
export type Magento2V1OrderShipConfig = {
	resource: 'order';
	operation: 'ship';
	orderId: string | Expression<string>;
};

/** Create a new customer */
export type Magento2V1ProductCreateConfig = {
	resource: 'product';
	operation: 'create';
/**
 * Stock-keeping unit of the product
 * @displayOptions.show { resource: ["product"], operation: ["create", "update"] }
 */
		sku: string | Expression<string>;
	name: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["product"], operation: ["create"] }
 */
		attributeSetId?: string | Expression<string>;
	price?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a customer */
export type Magento2V1ProductDeleteConfig = {
	resource: 'product';
	operation: 'delete';
/**
 * Stock-keeping unit of the product
 * @displayOptions.show { resource: ["product"], operation: ["delete", "get"] }
 */
		sku: string | Expression<string>;
};

/** Get a customer */
export type Magento2V1ProductGetConfig = {
	resource: 'product';
	operation: 'get';
/**
 * Stock-keeping unit of the product
 * @displayOptions.show { resource: ["product"], operation: ["delete", "get"] }
 */
		sku: string | Expression<string>;
};

/** Get many customers */
export type Magento2V1ProductGetAllConfig = {
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
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	filters?: {
		conditions?: Array<{
			/** Field
			 */
			field?: string | Expression<string>;
			/** Condition Type
			 * @default eq
			 */
			condition_type?: 'eq' | 'gt' | 'gteq' | 'in' | 'lt' | 'lte' | 'like' | 'moreq' | 'neq' | 'nin' | 'notnull' | 'null' | Expression<string>;
			/** Value
			 * @displayOptions.hide { condition_type: ["null", "notnull"] }
			 */
			value?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update a customer */
export type Magento2V1ProductUpdateConfig = {
	resource: 'product';
	operation: 'update';
/**
 * Stock-keeping unit of the product
 * @displayOptions.show { resource: ["product"], operation: ["create", "update"] }
 */
		sku: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type Magento2V1Params =
	| Magento2V1CustomerCreateConfig
	| Magento2V1CustomerDeleteConfig
	| Magento2V1CustomerGetConfig
	| Magento2V1CustomerGetAllConfig
	| Magento2V1CustomerUpdateConfig
	| Magento2V1InvoiceCreateConfig
	| Magento2V1OrderCancelConfig
	| Magento2V1OrderGetConfig
	| Magento2V1OrderGetAllConfig
	| Magento2V1OrderShipConfig
	| Magento2V1ProductCreateConfig
	| Magento2V1ProductDeleteConfig
	| Magento2V1ProductGetConfig
	| Magento2V1ProductGetAllConfig
	| Magento2V1ProductUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface Magento2V1Credentials {
	magento2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface Magento2V1NodeBase {
	type: 'n8n-nodes-base.magento2';
	version: 1;
	credentials?: Magento2V1Credentials;
}

export type Magento2V1CustomerCreateNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1CustomerCreateConfig>;
};

export type Magento2V1CustomerDeleteNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1CustomerDeleteConfig>;
};

export type Magento2V1CustomerGetNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1CustomerGetConfig>;
};

export type Magento2V1CustomerGetAllNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1CustomerGetAllConfig>;
};

export type Magento2V1CustomerUpdateNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1CustomerUpdateConfig>;
};

export type Magento2V1InvoiceCreateNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1InvoiceCreateConfig>;
};

export type Magento2V1OrderCancelNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1OrderCancelConfig>;
};

export type Magento2V1OrderGetNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1OrderGetConfig>;
};

export type Magento2V1OrderGetAllNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1OrderGetAllConfig>;
};

export type Magento2V1OrderShipNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1OrderShipConfig>;
};

export type Magento2V1ProductCreateNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1ProductCreateConfig>;
};

export type Magento2V1ProductDeleteNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1ProductDeleteConfig>;
};

export type Magento2V1ProductGetNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1ProductGetConfig>;
};

export type Magento2V1ProductGetAllNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1ProductGetAllConfig>;
};

export type Magento2V1ProductUpdateNode = Magento2V1NodeBase & {
	config: NodeConfig<Magento2V1ProductUpdateConfig>;
};

export type Magento2V1Node =
	| Magento2V1CustomerCreateNode
	| Magento2V1CustomerDeleteNode
	| Magento2V1CustomerGetNode
	| Magento2V1CustomerGetAllNode
	| Magento2V1CustomerUpdateNode
	| Magento2V1InvoiceCreateNode
	| Magento2V1OrderCancelNode
	| Magento2V1OrderGetNode
	| Magento2V1OrderGetAllNode
	| Magento2V1OrderShipNode
	| Magento2V1ProductCreateNode
	| Magento2V1ProductDeleteNode
	| Magento2V1ProductGetNode
	| Magento2V1ProductGetAllNode
	| Magento2V1ProductUpdateNode
	;