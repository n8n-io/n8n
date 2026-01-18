/**
 * Copper Node Types
 *
 * Consume the Copper API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/copper/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CopperV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	/**
	 * Name of the company to create
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
	/**
	 * ID of the company to delete
	 */
	companyId: string | Expression<string>;
};

export type CopperV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	/**
	 * ID of the company to retrieve
	 */
	companyId: string | Expression<string>;
};

export type CopperV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filterFields?: Record<string, unknown>;
};

export type CopperV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	/**
	 * ID of the company to update
	 */
	companyId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1CustomerSourceGetAllConfig = {
	resource: 'customerSource';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
};

export type CopperV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
	/**
	 * Name of the lead to create
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
	/**
	 * ID of the lead to delete
	 */
	leadId: string | Expression<string>;
};

export type CopperV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
	/**
	 * ID of the lead to retrieve
	 */
	leadId: string | Expression<string>;
};

export type CopperV1LeadGetAllConfig = {
	resource: 'lead';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filterFields?: Record<string, unknown>;
};

export type CopperV1LeadUpdateConfig = {
	resource: 'lead';
	operation: 'update';
	/**
	 * ID of the lead to update
	 */
	leadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
	/**
	 * Name of the opportunity to create
	 */
	name: string | Expression<string>;
	/**
	 * ID of the customer source that generated this opportunity
	 */
	customerSourceId?: string | Expression<string>;
	/**
	 * ID of the primary company associated with this opportunity
	 */
	primaryContactId?: string | Expression<string>;
};

export type CopperV1OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
	/**
	 * ID of the opportunity to delete
	 */
	opportunityId: string | Expression<string>;
};

export type CopperV1OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
	/**
	 * ID of the opportunity to retrieve
	 */
	opportunityId: string | Expression<string>;
};

export type CopperV1OpportunityGetAllConfig = {
	resource: 'opportunity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filterFields?: Record<string, unknown>;
};

export type CopperV1OpportunityUpdateConfig = {
	resource: 'opportunity';
	operation: 'update';
	/**
	 * ID of the opportunity to update
	 */
	opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1PersonCreateConfig = {
	resource: 'person';
	operation: 'create';
	/**
	 * Name of the person to create
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1PersonDeleteConfig = {
	resource: 'person';
	operation: 'delete';
	/**
	 * ID of the person to delete
	 */
	personId: string | Expression<string>;
};

export type CopperV1PersonGetConfig = {
	resource: 'person';
	operation: 'get';
	/**
	 * ID of the person to retrieve
	 */
	personId: string | Expression<string>;
};

export type CopperV1PersonGetAllConfig = {
	resource: 'person';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filterFields?: Record<string, unknown>;
};

export type CopperV1PersonUpdateConfig = {
	resource: 'person';
	operation: 'update';
	/**
	 * ID of the person to update
	 */
	personId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
	/**
	 * Name of the project to create
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
	/**
	 * ID of the project to delete
	 */
	projectId: string | Expression<string>;
};

export type CopperV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	/**
	 * ID of the project to retrieve
	 */
	projectId: string | Expression<string>;
};

export type CopperV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filterFields?: Record<string, unknown>;
};

export type CopperV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
	/**
	 * ID of the project to update
	 */
	projectId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * ID of the task to delete
	 */
	taskId: string | Expression<string>;
};

export type CopperV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * ID of the task to retrieve
	 */
	taskId: string | Expression<string>;
};

export type CopperV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filterFields?: Record<string, unknown>;
};

export type CopperV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * ID of the task to update
	 */
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
};

export type CopperV1Params =
	| CopperV1CompanyCreateConfig
	| CopperV1CompanyDeleteConfig
	| CopperV1CompanyGetConfig
	| CopperV1CompanyGetAllConfig
	| CopperV1CompanyUpdateConfig
	| CopperV1CustomerSourceGetAllConfig
	| CopperV1LeadCreateConfig
	| CopperV1LeadDeleteConfig
	| CopperV1LeadGetConfig
	| CopperV1LeadGetAllConfig
	| CopperV1LeadUpdateConfig
	| CopperV1OpportunityCreateConfig
	| CopperV1OpportunityDeleteConfig
	| CopperV1OpportunityGetConfig
	| CopperV1OpportunityGetAllConfig
	| CopperV1OpportunityUpdateConfig
	| CopperV1PersonCreateConfig
	| CopperV1PersonDeleteConfig
	| CopperV1PersonGetConfig
	| CopperV1PersonGetAllConfig
	| CopperV1PersonUpdateConfig
	| CopperV1ProjectCreateConfig
	| CopperV1ProjectDeleteConfig
	| CopperV1ProjectGetConfig
	| CopperV1ProjectGetAllConfig
	| CopperV1ProjectUpdateConfig
	| CopperV1TaskCreateConfig
	| CopperV1TaskDeleteConfig
	| CopperV1TaskGetConfig
	| CopperV1TaskGetAllConfig
	| CopperV1TaskUpdateConfig
	| CopperV1UserGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CopperV1Credentials {
	copperApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type CopperV1Node = {
	type: 'n8n-nodes-base.copper';
	version: 1;
	config: NodeConfig<CopperV1Params>;
	credentials?: CopperV1Credentials;
};

export type CopperNode = CopperV1Node;
