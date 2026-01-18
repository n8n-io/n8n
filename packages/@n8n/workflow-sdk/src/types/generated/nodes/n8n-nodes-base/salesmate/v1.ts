/**
 * Salesmate Node - Version 1
 * Consume Salesmate API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a company */
export type SalesmateV1ActivityCreateConfig = {
	resource: 'activity';
	operation: 'create';
	title: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 */
		owner: string | Expression<string>;
/**
 * This field displays activity type such as call, meeting etc
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 */
		type: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a company */
export type SalesmateV1ActivityDeleteConfig = {
	resource: 'activity';
	operation: 'delete';
/**
 * If more than one activity add them separated by ,
 * @displayOptions.show { resource: ["activity"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Get a company */
export type SalesmateV1ActivityGetConfig = {
	resource: 'activity';
	operation: 'get';
	id: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["activity"], operation: ["get"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
};

/** Get many companies */
export type SalesmateV1ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["activity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["activity"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	filtersJson?: IDataObject | string | Expression<string>;
	filters?: {
		filtersUi?: {
			/** Operator
			 * @default AND
			 */
			operator?: 'AND' | 'OR' | Expression<string>;
			/** Conditions
			 * @default {}
			 */
			conditions?: {
		conditionsUi?: Array<{
			/** Field
			 * @default title
			 */
			field?: 'title' | 'tags' | Expression<string>;
			/** Value of the property to set
			 * @default EQUALS
			 */
			condition?: 'EQUALS' | 'NOT_EQUALS' | 'Contains' | 'DOES_NOT_CONTAINS' | 'EMPTY' | 'NOT_EMPTY' | 'STARTS_WITH' | 'ENDS_WITH' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
		};
	};
};

/** Update a company */
export type SalesmateV1ActivityUpdateConfig = {
	resource: 'activity';
	operation: 'update';
	id: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["activity"], operation: ["update"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

/** Create a company */
export type SalesmateV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	name: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["company"], operation: ["create"] }
 */
		owner: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["company"], operation: ["create"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a company */
export type SalesmateV1CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
/**
 * If more than one company add them separated by ,
 * @displayOptions.show { resource: ["company"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Get a company */
export type SalesmateV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	id: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
};

/** Get many companies */
export type SalesmateV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	filtersJson?: IDataObject | string | Expression<string>;
	filters?: {
		filtersUi?: {
			/** Operator
			 * @default AND
			 */
			operator?: 'AND' | 'OR' | Expression<string>;
			/** Conditions
			 * @default {}
			 */
			conditions?: {
		conditionsUi?: Array<{
			/** Field
			 * @default name
			 */
			field?: 'name' | 'email' | 'phone' | Expression<string>;
			/** Value of the property to set
			 * @default EQUALS
			 */
			condition?: 'EQUALS' | 'NOT_EQUALS' | 'Contains' | 'DOES_NOT_CONTAINS' | 'EMPTY' | 'NOT_EMPTY' | 'STARTS_WITH' | 'ENDS_WITH' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
		};
	};
};

/** Update a company */
export type SalesmateV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	id: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["company"], operation: ["update"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

/** Create a company */
export type SalesmateV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
	title: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
 */
		owner: string | Expression<string>;
/**
 * Primary contact for the deal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
 */
		primaryContact: string | Expression<string>;
	pipeline: 'Sales' | Expression<string>;
	status: 'Open' | 'Close' | 'Lost' | Expression<string>;
	stage: 'New (Untouched)' | 'Contacted' | 'Qualified' | 'In Negotiation' | 'Proposal Presented' | Expression<string>;
	currency: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a company */
export type SalesmateV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
/**
 * If more than one deal add them separated by ,
 * @displayOptions.show { resource: ["deal"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Get a company */
export type SalesmateV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	id: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["deal"], operation: ["get"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
};

/** Get many companies */
export type SalesmateV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	filtersJson?: IDataObject | string | Expression<string>;
	filters?: {
		filtersUi?: {
			/** Operator
			 * @default AND
			 */
			operator?: 'AND' | 'OR' | Expression<string>;
			/** Conditions
			 * @default {}
			 */
			conditions?: {
		conditionsUi?: Array<{
			/** Field
			 * @default title
			 */
			field?: 'title' | 'tags' | 'lastCommunicationMode' | Expression<string>;
			/** Value of the property to set
			 * @default EQUALS
			 */
			condition?: 'EQUALS' | 'NOT_EQUALS' | 'Contains' | 'DOES_NOT_CONTAINS' | 'EMPTY' | 'NOT_EMPTY' | 'STARTS_WITH' | 'ENDS_WITH' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
		};
	};
};

/** Update a company */
export type SalesmateV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	id: string | Expression<string>;
/**
 * Whether the data should include the fields details
 * @displayOptions.show { resource: ["deal"], operation: ["update"] }
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
};

export type SalesmateV1Params =
	| SalesmateV1ActivityCreateConfig
	| SalesmateV1ActivityDeleteConfig
	| SalesmateV1ActivityGetConfig
	| SalesmateV1ActivityGetAllConfig
	| SalesmateV1ActivityUpdateConfig
	| SalesmateV1CompanyCreateConfig
	| SalesmateV1CompanyDeleteConfig
	| SalesmateV1CompanyGetConfig
	| SalesmateV1CompanyGetAllConfig
	| SalesmateV1CompanyUpdateConfig
	| SalesmateV1DealCreateConfig
	| SalesmateV1DealDeleteConfig
	| SalesmateV1DealGetConfig
	| SalesmateV1DealGetAllConfig
	| SalesmateV1DealUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SalesmateV1Credentials {
	salesmateApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SalesmateV1Node = {
	type: 'n8n-nodes-base.salesmate';
	version: 1;
	config: NodeConfig<SalesmateV1Params>;
	credentials?: SalesmateV1Credentials;
};