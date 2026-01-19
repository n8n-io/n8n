/**
 * Cockpit Node - Version 1
 * Consume Cockpit API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a collection entry */
export type CockpitV1CollectionCreateConfig = {
	resource: 'collection';
	operation: 'create';
/**
 * Name of the collection to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["collection"] }
 */
		collection: string | Expression<string>;
/**
 * Whether new entry fields should be set via the value-key pair UI or JSON
 * @displayOptions.show { resource: ["collection"], operation: ["create", "update"] }
 * @default false
 */
		jsonDataFields?: boolean | Expression<boolean>;
/**
 * Entry data to send as JSON
 * @displayOptions.show { jsonDataFields: [true], resource: ["collection"], operation: ["create", "update"] }
 */
		dataFieldsJson?: IDataObject | string | Expression<string>;
/**
 * Entry data to send
 * @displayOptions.show { jsonDataFields: [false], resource: ["collection"], operation: ["create", "update"] }
 * @default {}
 */
		dataFieldsUi?: {
		field?: Array<{
			/** Name of the field
			 */
			name?: string | Expression<string>;
			/** Value of the field
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Get many collection entries */
export type CockpitV1CollectionGetAllConfig = {
	resource: 'collection';
	operation: 'getAll';
/**
 * Name of the collection to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["collection"] }
 */
		collection: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["collection"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["collection"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a collection entry */
export type CockpitV1CollectionUpdateConfig = {
	resource: 'collection';
	operation: 'update';
/**
 * Name of the collection to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["collection"] }
 */
		collection: string | Expression<string>;
	id: string | Expression<string>;
/**
 * Whether new entry fields should be set via the value-key pair UI or JSON
 * @displayOptions.show { resource: ["collection"], operation: ["create", "update"] }
 * @default false
 */
		jsonDataFields?: boolean | Expression<boolean>;
/**
 * Entry data to send as JSON
 * @displayOptions.show { jsonDataFields: [true], resource: ["collection"], operation: ["create", "update"] }
 */
		dataFieldsJson?: IDataObject | string | Expression<string>;
/**
 * Entry data to send
 * @displayOptions.show { jsonDataFields: [false], resource: ["collection"], operation: ["create", "update"] }
 * @default {}
 */
		dataFieldsUi?: {
		field?: Array<{
			/** Name of the field
			 */
			name?: string | Expression<string>;
			/** Value of the field
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Store data from a form submission */
export type CockpitV1FormSubmitConfig = {
	resource: 'form';
	operation: 'submit';
/**
 * Name of the form to operate on
 * @displayOptions.show { resource: ["form"] }
 */
		form: string | Expression<string>;
/**
 * Whether form fields should be set via the value-key pair UI or JSON
 * @displayOptions.show { resource: ["form"], operation: ["submit"] }
 * @default false
 */
		jsonDataFields?: boolean | Expression<boolean>;
/**
 * Form data to send as JSON
 * @displayOptions.show { jsonDataFields: [true], resource: ["form"], operation: ["submit"] }
 */
		dataFieldsJson?: IDataObject | string | Expression<string>;
/**
 * Form data to send
 * @displayOptions.show { jsonDataFields: [false], resource: ["form"], operation: ["submit"] }
 * @default {}
 */
		dataFieldsUi?: {
		field?: Array<{
			/** Name of the field
			 */
			name?: string | Expression<string>;
			/** Value of the field
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Get a singleton */
export type CockpitV1SingletonGetConfig = {
	resource: 'singleton';
	operation: 'get';
/**
 * Name of the singleton to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["singleton"] }
 */
		singleton: string | Expression<string>;
};

export type CockpitV1Params =
	| CockpitV1CollectionCreateConfig
	| CockpitV1CollectionGetAllConfig
	| CockpitV1CollectionUpdateConfig
	| CockpitV1FormSubmitConfig
	| CockpitV1SingletonGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CockpitV1Credentials {
	cockpitApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CockpitV1NodeBase {
	type: 'n8n-nodes-base.cockpit';
	version: 1;
	credentials?: CockpitV1Credentials;
}

export type CockpitV1CollectionCreateNode = CockpitV1NodeBase & {
	config: NodeConfig<CockpitV1CollectionCreateConfig>;
};

export type CockpitV1CollectionGetAllNode = CockpitV1NodeBase & {
	config: NodeConfig<CockpitV1CollectionGetAllConfig>;
};

export type CockpitV1CollectionUpdateNode = CockpitV1NodeBase & {
	config: NodeConfig<CockpitV1CollectionUpdateConfig>;
};

export type CockpitV1FormSubmitNode = CockpitV1NodeBase & {
	config: NodeConfig<CockpitV1FormSubmitConfig>;
};

export type CockpitV1SingletonGetNode = CockpitV1NodeBase & {
	config: NodeConfig<CockpitV1SingletonGetConfig>;
};

export type CockpitV1Node =
	| CockpitV1CollectionCreateNode
	| CockpitV1CollectionGetAllNode
	| CockpitV1CollectionUpdateNode
	| CockpitV1FormSubmitNode
	| CockpitV1SingletonGetNode
	;