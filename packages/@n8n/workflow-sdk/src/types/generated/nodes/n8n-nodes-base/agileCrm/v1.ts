/**
 * Agile CRM Node - Version 1
 * Consume Agile CRM API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new contact */
export type AgileCrmV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-companys---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["company"], operation: ["create"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type AgileCrmV1CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
/**
 * ID of company to delete
 * @displayOptions.show { resource: ["company"], operation: ["delete"] }
 */
		companyId: string | Expression<string>;
};

/** Get a contact */
export type AgileCrmV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
/**
 * Unique identifier for a particular company
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
 */
		companyId: string | Expression<string>;
};

/** Get many contacts */
export type AgileCrmV1CompanyGetAllConfig = {
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
 * @default 20
 */
		limit?: number | Expression<number>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["company"], operation: ["getAll"] }
 * @default false
 */
		simple?: boolean | Expression<boolean>;
	filters?: {
		conditions?: Array<{
			/** Any searchable field
			 */
			field?: string | Expression<string>;
			/** Condition Type
			 * @default EQUALS
			 */
			condition_type?: 'AFTER' | 'BEFORE' | 'BETWEEN' | 'EQUALS' | 'LAST' | 'NOTEQUALS' | 'ON' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
			/** Value 2
			 * @displayOptions.show { condition_type: ["BETWEEN"] }
			 */
			value2?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update contact properties */
export type AgileCrmV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
/**
 * Unique identifier for a particular company
 * @displayOptions.show { resource: ["company"], operation: ["update"] }
 */
		companyId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-companys---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["company"], operation: ["update"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new contact */
export type AgileCrmV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["create"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type AgileCrmV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * ID of contact to delete
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
};

/** Get a contact */
export type AgileCrmV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Unique identifier for a particular contact
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
};

/** Get many contacts */
export type AgileCrmV1ContactGetAllConfig = {
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
 * @default 20
 */
		limit?: number | Expression<number>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		simple?: boolean | Expression<boolean>;
	filters?: {
		conditions?: Array<{
			/** Any searchable field
			 */
			field?: string | Expression<string>;
			/** Condition Type
			 * @default EQUALS
			 */
			condition_type?: 'AFTER' | 'BEFORE' | 'BETWEEN' | 'EQUALS' | 'LAST' | 'NOTEQUALS' | 'ON' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
			/** Value 2
			 * @displayOptions.show { condition_type: ["BETWEEN"] }
			 */
			value2?: string | Expression<string>;
		}>;
	};
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update contact properties */
export type AgileCrmV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
/**
 * Unique identifier for a particular contact
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
 */
		contactId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["update"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new contact */
export type AgileCrmV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
/**
 * Closing date of deal
 * @displayOptions.show { resource: ["deal"], operation: ["create"], jsonParameters: [false] }
 */
		closeDate: string | Expression<string>;
/**
 * Expected Value of deal
 * @displayOptions.show { resource: ["deal"], operation: ["create"], jsonParameters: [false] }
 * @default 1
 */
		expectedValue: number | Expression<number>;
/**
 * Milestone of deal
 * @displayOptions.show { resource: ["deal"], operation: ["create"], jsonParameters: [false] }
 */
		milestone: string | Expression<string>;
/**
 * Name of deal
 * @displayOptions.show { resource: ["deal"], operation: ["create"], jsonParameters: [false] }
 */
		name: string | Expression<string>;
/**
 * Expected probability
 * @displayOptions.show { resource: ["deal"], operation: ["create"], jsonParameters: [false] }
 * @default 50
 */
		probability: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-deals---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["deal"], operation: ["create"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type AgileCrmV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
/**
 * ID of deal to delete
 * @displayOptions.show { resource: ["deal"], operation: ["delete"] }
 */
		dealId: string | Expression<string>;
};

/** Get a contact */
export type AgileCrmV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
/**
 * Unique identifier for a particular deal
 * @displayOptions.show { resource: ["deal"], operation: ["get"] }
 */
		dealId: string | Expression<string>;
};

/** Get many contacts */
export type AgileCrmV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
};

/** Update contact properties */
export type AgileCrmV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
/**
 * ID of deal to update
 * @displayOptions.show { resource: ["deal"], operation: ["update"] }
 */
		dealId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-deals---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["deal"], operation: ["update"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface AgileCrmV1Credentials {
	agileCrmApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AgileCrmV1NodeBase {
	type: 'n8n-nodes-base.agileCrm';
	version: 1;
	credentials?: AgileCrmV1Credentials;
}

export type AgileCrmV1CompanyCreateNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1CompanyCreateConfig>;
};

export type AgileCrmV1CompanyDeleteNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1CompanyDeleteConfig>;
};

export type AgileCrmV1CompanyGetNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1CompanyGetConfig>;
};

export type AgileCrmV1CompanyGetAllNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1CompanyGetAllConfig>;
};

export type AgileCrmV1CompanyUpdateNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1CompanyUpdateConfig>;
};

export type AgileCrmV1ContactCreateNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1ContactCreateConfig>;
};

export type AgileCrmV1ContactDeleteNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1ContactDeleteConfig>;
};

export type AgileCrmV1ContactGetNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1ContactGetConfig>;
};

export type AgileCrmV1ContactGetAllNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1ContactGetAllConfig>;
};

export type AgileCrmV1ContactUpdateNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1ContactUpdateConfig>;
};

export type AgileCrmV1DealCreateNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1DealCreateConfig>;
};

export type AgileCrmV1DealDeleteNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1DealDeleteConfig>;
};

export type AgileCrmV1DealGetNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1DealGetConfig>;
};

export type AgileCrmV1DealGetAllNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1DealGetAllConfig>;
};

export type AgileCrmV1DealUpdateNode = AgileCrmV1NodeBase & {
	config: NodeConfig<AgileCrmV1DealUpdateConfig>;
};

export type AgileCrmV1Node =
	| AgileCrmV1CompanyCreateNode
	| AgileCrmV1CompanyDeleteNode
	| AgileCrmV1CompanyGetNode
	| AgileCrmV1CompanyGetAllNode
	| AgileCrmV1CompanyUpdateNode
	| AgileCrmV1ContactCreateNode
	| AgileCrmV1ContactDeleteNode
	| AgileCrmV1ContactGetNode
	| AgileCrmV1ContactGetAllNode
	| AgileCrmV1ContactUpdateNode
	| AgileCrmV1DealCreateNode
	| AgileCrmV1DealDeleteNode
	| AgileCrmV1DealGetNode
	| AgileCrmV1DealGetAllNode
	| AgileCrmV1DealUpdateNode
	;