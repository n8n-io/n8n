/**
 * ERPNext Node - Version 1
 * Consume ERPNext API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a document */
export type ErpNextV1DocumentCreateConfig = {
	resource: 'document';
	operation: 'create';
/**
 * DocType you would like to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["create"] }
 */
		docType: string | Expression<string>;
	properties: {
		customProperty?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @default []
			 */
			field?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Delete a document */
export type ErpNextV1DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
/**
 * The type of document you would like to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["delete"] }
 */
		docType: string | Expression<string>;
/**
 * The name (ID) of document you would like to get
 * @displayOptions.show { resource: ["document"], operation: ["delete"] }
 */
		documentName: string | Expression<string>;
};

/** Retrieve a document */
export type ErpNextV1DocumentGetConfig = {
	resource: 'document';
	operation: 'get';
/**
 * The type of document you would like to get. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["get"] }
 */
		docType: string | Expression<string>;
/**
 * The name (ID) of document you would like to get
 * @displayOptions.show { resource: ["document"], operation: ["get"] }
 */
		documentName: string | Expression<string>;
};

/** Retrieve many documents */
export type ErpNextV1DocumentGetAllConfig = {
	resource: 'document';
	operation: 'getAll';
/**
 * DocType whose documents to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["getAll"] }
 */
		docType?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["document"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["document"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a document */
export type ErpNextV1DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
/**
 * The type of document you would like to update. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["document"], operation: ["update"] }
 */
		docType: string | Expression<string>;
/**
 * The name (ID) of document you would like to get
 * @displayOptions.show { resource: ["document"], operation: ["update"] }
 */
		documentName: string | Expression<string>;
/**
 * Properties of request body
 * @displayOptions.show { resource: ["document"], operation: ["update"] }
 * @default {}
 */
		properties?: {
		customProperty?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			field?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ErpNextV1DocumentCreateOutput = {
	annual_revenue?: number;
	base_opportunity_amount?: number;
	base_total?: number;
	company?: string;
	conversion_rate?: number;
	creation?: string;
	currency?: string;
	customer_name?: string;
	disabled?: number;
	docstatus?: number;
	doctype?: string;
	idx?: number;
	items?: Array<{
		__unsaved?: number;
		creation?: string;
		description?: string;
		docstatus?: number;
		doctype?: string;
		idx?: number;
		item_name?: string;
		modified?: string;
		modified_by?: string;
		name?: string;
		owner?: string;
		parent?: string;
		parentfield?: string;
		parenttype?: string;
		qty?: number;
		rate?: number;
	}>;
	language?: string;
	modified?: string;
	modified_by?: string;
	name?: string;
	naming_series?: string;
	no_of_employees?: string;
	opportunity_amount?: number;
	opportunity_from?: string;
	opportunity_type?: string;
	owner?: string;
	party_name?: string;
	probability?: number;
	status?: string;
	title?: string;
	total?: number;
	transaction_date?: string;
};

export type ErpNextV1DocumentGetOutput = {
	creation?: string;
	docstatus?: number;
	doctype?: string;
	idx?: number;
	modified?: string;
	modified_by?: string;
	name?: string;
	owner?: string;
};

export type ErpNextV1DocumentGetAllOutput = {
	name?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ErpNextV1Credentials {
	erpNextApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ErpNextV1NodeBase {
	type: 'n8n-nodes-base.erpNext';
	version: 1;
	credentials?: ErpNextV1Credentials;
}

export type ErpNextV1DocumentCreateNode = ErpNextV1NodeBase & {
	config: NodeConfig<ErpNextV1DocumentCreateConfig>;
	output?: ErpNextV1DocumentCreateOutput;
};

export type ErpNextV1DocumentDeleteNode = ErpNextV1NodeBase & {
	config: NodeConfig<ErpNextV1DocumentDeleteConfig>;
};

export type ErpNextV1DocumentGetNode = ErpNextV1NodeBase & {
	config: NodeConfig<ErpNextV1DocumentGetConfig>;
	output?: ErpNextV1DocumentGetOutput;
};

export type ErpNextV1DocumentGetAllNode = ErpNextV1NodeBase & {
	config: NodeConfig<ErpNextV1DocumentGetAllConfig>;
	output?: ErpNextV1DocumentGetAllOutput;
};

export type ErpNextV1DocumentUpdateNode = ErpNextV1NodeBase & {
	config: NodeConfig<ErpNextV1DocumentUpdateConfig>;
};

export type ErpNextV1Node =
	| ErpNextV1DocumentCreateNode
	| ErpNextV1DocumentDeleteNode
	| ErpNextV1DocumentGetNode
	| ErpNextV1DocumentGetAllNode
	| ErpNextV1DocumentUpdateNode
	;