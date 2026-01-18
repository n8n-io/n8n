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
	 */
	companyId: string | Expression<string>;
};

/** Get a contact */
export type AgileCrmV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	/**
	 * Unique identifier for a particular company
	 */
	companyId: string | Expression<string>;
};

/** Get many contacts */
export type AgileCrmV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default false
	 */
	simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update contact properties */
export type AgileCrmV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	/**
	 * Unique identifier for a particular company
	 */
	companyId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-companys---companies-api"&gt;here&lt;/a&gt;
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
	 */
	contactId: string | Expression<string>;
};

/** Get a contact */
export type AgileCrmV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Unique identifier for a particular contact
	 */
	contactId: string | Expression<string>;
};

/** Get many contacts */
export type AgileCrmV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	filterType?: 'none' | 'manual' | 'json' | Expression<string>;
	matchType?: 'anyFilter' | 'allFilters' | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default false
	 */
	simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
	filterJson?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update contact properties */
export type AgileCrmV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Unique identifier for a particular contact
	 */
	contactId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api"&gt;here&lt;/a&gt;
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
	 */
	closeDate: string | Expression<string>;
	/**
	 * Expected Value of deal
	 * @default 1
	 */
	expectedValue: number | Expression<number>;
	/**
	 * Milestone of deal
	 */
	milestone: string | Expression<string>;
	/**
	 * Name of deal
	 */
	name: string | Expression<string>;
	/**
	 * Expected probability
	 * @default 50
	 */
	probability: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-deals---companies-api"&gt;here&lt;/a&gt;
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
	 */
	dealId: string | Expression<string>;
};

/** Get a contact */
export type AgileCrmV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	/**
	 * Unique identifier for a particular deal
	 */
	dealId: string | Expression<string>;
};

/** Get many contacts */
export type AgileCrmV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return all results or only up to a given limit
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
	 */
	dealId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-deals---companies-api"&gt;here&lt;/a&gt;
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
