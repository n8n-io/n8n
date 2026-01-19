/**
 * Odoo Node - Version 1
 * Consume Odoo API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new item */
export type OdooV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	contactName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an item */
export type OdooV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: string | Expression<string>;
};

/** Get an item */
export type OdooV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many items */
export type OdooV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an item */
export type OdooV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new item */
export type OdooV1CustomCreateConfig = {
	resource: 'custom';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["custom"] }
 */
		customResource?: string | Expression<string>;
	fieldsToCreateOrUpdate?: {
		fields?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldName?: string | Expression<string>;
			/** New Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};

/** Delete an item */
export type OdooV1CustomDeleteConfig = {
	resource: 'custom';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["custom"] }
 */
		customResource?: string | Expression<string>;
	customResourceId: string | Expression<string>;
};

/** Get an item */
export type OdooV1CustomGetConfig = {
	resource: 'custom';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["custom"] }
 */
		customResource?: string | Expression<string>;
	customResourceId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many items */
export type OdooV1CustomGetAllConfig = {
	resource: 'custom';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["custom"] }
 */
		customResource?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["custom"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["custom"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
/**
 * Filter request by applying filters
 * @displayOptions.show { operation: ["getAll"], resource: ["custom"] }
 * @default {}
 */
		filterRequest?: {
		filter?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldName?: string | Expression<string>;
			/** Specify an operator
			 * @default equal
			 */
			operator?: 'notEqual' | 'lesserThen' | 'lesserOrEqual' | 'equal' | 'greaterThen' | 'greaterOrEqual' | 'childOf' | 'in' | 'like' | 'notIn' | Expression<string>;
			/** Specify value for comparison
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Update an item */
export type OdooV1CustomUpdateConfig = {
	resource: 'custom';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["custom"] }
 */
		customResource?: string | Expression<string>;
	customResourceId: string | Expression<string>;
	fieldsToCreateOrUpdate?: {
		fields?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			fieldName?: string | Expression<string>;
			/** New Value
			 */
			fieldValue?: string | Expression<string>;
		}>;
	};
};

/** Create a new item */
export type OdooV1NoteCreateConfig = {
	resource: 'note';
	operation: 'create';
	memo: string | Expression<string>;
};

/** Delete an item */
export type OdooV1NoteDeleteConfig = {
	resource: 'note';
	operation: 'delete';
	noteId: string | Expression<string>;
};

/** Get an item */
export type OdooV1NoteGetConfig = {
	resource: 'note';
	operation: 'get';
	noteId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many items */
export type OdooV1NoteGetAllConfig = {
	resource: 'note';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["note"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["note"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an item */
export type OdooV1NoteUpdateConfig = {
	resource: 'note';
	operation: 'update';
	noteId: string | Expression<string>;
	memo: string | Expression<string>;
};

/** Create a new item */
export type OdooV1OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
	opportunityName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an item */
export type OdooV1OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
	opportunityId: string | Expression<string>;
};

/** Get an item */
export type OdooV1OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
	opportunityId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many items */
export type OdooV1OpportunityGetAllConfig = {
	resource: 'opportunity';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update an item */
export type OdooV1OpportunityUpdateConfig = {
	resource: 'opportunity';
	operation: 'update';
	opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type OdooV1ContactCreateOutput = {
	id?: number;
};

export type OdooV1ContactGetOutput = {
	id?: number;
};

export type OdooV1ContactGetAllOutput = {
	id?: number;
};

export type OdooV1CustomCreateOutput = {
	id?: number;
};

export type OdooV1CustomDeleteOutput = {
	success?: boolean;
};

export type OdooV1CustomGetOutput = {
	id?: number;
};

export type OdooV1CustomGetAllOutput = {
	id?: number;
};

export type OdooV1OpportunityCreateOutput = {
	id?: number;
};

export type OdooV1OpportunityGetOutput = {
	__last_update?: string;
	active?: boolean;
	id?: number;
	kanban_state?: string;
	lost_reason?: boolean;
	name?: string;
	order_ids?: Array<number>;
	priority?: string;
	sale_amount_total?: number;
	sale_order_count?: number;
	type?: string;
	website_message_ids?: Array<number>;
	won_status?: string;
	write_date?: string;
};

export type OdooV1OpportunityGetAllOutput = {
	create_date?: string;
	display_name?: string;
	id?: number;
	name?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface OdooV1Credentials {
	odooApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface OdooV1NodeBase {
	type: 'n8n-nodes-base.odoo';
	version: 1;
	credentials?: OdooV1Credentials;
}

export type OdooV1ContactCreateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1ContactCreateConfig>;
	output?: OdooV1ContactCreateOutput;
};

export type OdooV1ContactDeleteNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1ContactDeleteConfig>;
};

export type OdooV1ContactGetNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1ContactGetConfig>;
	output?: OdooV1ContactGetOutput;
};

export type OdooV1ContactGetAllNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1ContactGetAllConfig>;
	output?: OdooV1ContactGetAllOutput;
};

export type OdooV1ContactUpdateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1ContactUpdateConfig>;
};

export type OdooV1CustomCreateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1CustomCreateConfig>;
	output?: OdooV1CustomCreateOutput;
};

export type OdooV1CustomDeleteNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1CustomDeleteConfig>;
	output?: OdooV1CustomDeleteOutput;
};

export type OdooV1CustomGetNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1CustomGetConfig>;
	output?: OdooV1CustomGetOutput;
};

export type OdooV1CustomGetAllNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1CustomGetAllConfig>;
	output?: OdooV1CustomGetAllOutput;
};

export type OdooV1CustomUpdateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1CustomUpdateConfig>;
};

export type OdooV1NoteCreateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1NoteCreateConfig>;
};

export type OdooV1NoteDeleteNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1NoteDeleteConfig>;
};

export type OdooV1NoteGetNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1NoteGetConfig>;
};

export type OdooV1NoteGetAllNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1NoteGetAllConfig>;
};

export type OdooV1NoteUpdateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1NoteUpdateConfig>;
};

export type OdooV1OpportunityCreateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1OpportunityCreateConfig>;
	output?: OdooV1OpportunityCreateOutput;
};

export type OdooV1OpportunityDeleteNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1OpportunityDeleteConfig>;
};

export type OdooV1OpportunityGetNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1OpportunityGetConfig>;
	output?: OdooV1OpportunityGetOutput;
};

export type OdooV1OpportunityGetAllNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1OpportunityGetAllConfig>;
	output?: OdooV1OpportunityGetAllOutput;
};

export type OdooV1OpportunityUpdateNode = OdooV1NodeBase & {
	config: NodeConfig<OdooV1OpportunityUpdateConfig>;
};

export type OdooV1Node =
	| OdooV1ContactCreateNode
	| OdooV1ContactDeleteNode
	| OdooV1ContactGetNode
	| OdooV1ContactGetAllNode
	| OdooV1ContactUpdateNode
	| OdooV1CustomCreateNode
	| OdooV1CustomDeleteNode
	| OdooV1CustomGetNode
	| OdooV1CustomGetAllNode
	| OdooV1CustomUpdateNode
	| OdooV1NoteCreateNode
	| OdooV1NoteDeleteNode
	| OdooV1NoteGetNode
	| OdooV1NoteGetAllNode
	| OdooV1NoteUpdateNode
	| OdooV1OpportunityCreateNode
	| OdooV1OpportunityDeleteNode
	| OdooV1OpportunityGetNode
	| OdooV1OpportunityGetAllNode
	| OdooV1OpportunityUpdateNode
	;