/**
 * Odoo Node - Version 1
 * Consume Odoo API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type OdooV1Params =
	| OdooV1ContactCreateConfig
	| OdooV1ContactDeleteConfig
	| OdooV1ContactGetConfig
	| OdooV1ContactGetAllConfig
	| OdooV1ContactUpdateConfig
	| OdooV1CustomCreateConfig
	| OdooV1CustomDeleteConfig
	| OdooV1CustomGetConfig
	| OdooV1CustomGetAllConfig
	| OdooV1CustomUpdateConfig
	| OdooV1NoteCreateConfig
	| OdooV1NoteDeleteConfig
	| OdooV1NoteGetConfig
	| OdooV1NoteGetAllConfig
	| OdooV1NoteUpdateConfig
	| OdooV1OpportunityCreateConfig
	| OdooV1OpportunityDeleteConfig
	| OdooV1OpportunityGetConfig
	| OdooV1OpportunityGetAllConfig
	| OdooV1OpportunityUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface OdooV1Credentials {
	odooApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type OdooV1Node = {
	type: 'n8n-nodes-base.odoo';
	version: 1;
	config: NodeConfig<OdooV1Params>;
	credentials?: OdooV1Credentials;
};