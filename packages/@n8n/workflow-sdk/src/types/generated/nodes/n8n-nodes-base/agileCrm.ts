/**
 * Agile CRM Node Types
 *
 * Consume Agile CRM API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/agilecrm/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
			condition_type?:
				| 'AFTER'
				| 'BEFORE'
				| 'BETWEEN'
				| 'EQUALS'
				| 'LAST'
				| 'NOTEQUALS'
				| 'ON'
				| Expression<string>;
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
			condition_type?:
				| 'AFTER'
				| 'BEFORE'
				| 'BETWEEN'
				| 'EQUALS'
				| 'LAST'
				| 'NOTEQUALS'
				| 'ON'
				| Expression<string>;
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

export type AgileCrmV1Params =
	| AgileCrmV1CompanyCreateConfig
	| AgileCrmV1CompanyDeleteConfig
	| AgileCrmV1CompanyGetConfig
	| AgileCrmV1CompanyGetAllConfig
	| AgileCrmV1CompanyUpdateConfig
	| AgileCrmV1ContactCreateConfig
	| AgileCrmV1ContactDeleteConfig
	| AgileCrmV1ContactGetConfig
	| AgileCrmV1ContactGetAllConfig
	| AgileCrmV1ContactUpdateConfig
	| AgileCrmV1DealCreateConfig
	| AgileCrmV1DealDeleteConfig
	| AgileCrmV1DealGetConfig
	| AgileCrmV1DealGetAllConfig
	| AgileCrmV1DealUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AgileCrmV1Credentials {
	agileCrmApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AgileCrmV1Node = {
	type: 'n8n-nodes-base.agileCrm';
	version: 1;
	config: NodeConfig<AgileCrmV1Params>;
	credentials?: AgileCrmV1Credentials;
};

export type AgileCrmNode = AgileCrmV1Node;
