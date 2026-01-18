/**
 * Salesmate Node Types
 *
 * Consume Salesmate API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/salesmate/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
	 */
	owner: string | Expression<string>;
	/**
	 * This field displays activity type such as call, meeting etc
	 */
	type: string | Expression<string>;
	/**
	 * Whether the data should include the fields details
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	filtersJson?: IDataObject | string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Update a company */
export type SalesmateV1ActivityUpdateConfig = {
	resource: 'activity';
	operation: 'update';
	id: string | Expression<string>;
	/**
	 * Whether the data should include the fields details
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
	 */
	owner: string | Expression<string>;
	/**
	 * Whether the data should include the fields details
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	filtersJson?: IDataObject | string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Update a company */
export type SalesmateV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	id: string | Expression<string>;
	/**
	 * Whether the data should include the fields details
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
	 */
	owner: string | Expression<string>;
	/**
	 * Primary contact for the deal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	primaryContact: string | Expression<string>;
	pipeline: 'Sales' | Expression<string>;
	status: 'Open' | 'Close' | 'Lost' | Expression<string>;
	stage:
		| 'New (Untouched)'
		| 'Contacted'
		| 'Qualified'
		| 'In Negotiation'
		| 'Proposal Presented'
		| Expression<string>;
	currency: string | Expression<string>;
	/**
	 * Whether the data should include the fields details
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	filtersJson?: IDataObject | string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Update a company */
export type SalesmateV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	id: string | Expression<string>;
	/**
	 * Whether the data should include the fields details
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
	| SalesmateV1DealUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SalesmateV1Credentials {
	salesmateApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SalesmateV1Node = {
	type: 'n8n-nodes-base.salesmate';
	version: 1;
	config: NodeConfig<SalesmateV1Params>;
	credentials?: SalesmateV1Credentials;
};

export type SalesmateNode = SalesmateV1Node;
