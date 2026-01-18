/**
 * Copper Node - Version 1
 * Consume the Copper API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CopperV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
/**
 * Name of the company to create
 * @displayOptions.show { resource: ["company"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
/**
 * ID of the company to delete
 * @displayOptions.show { resource: ["company"], operation: ["delete"] }
 */
		companyId: string | Expression<string>;
};

export type CopperV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
/**
 * ID of the company to retrieve
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
 */
		companyId: string | Expression<string>;
};

export type CopperV1CompanyGetAllConfig = {
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
 * @displayOptions.show { resource: ["company"], operation: ["update"] }
 */
		companyId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1CustomerSourceGetAllConfig = {
	resource: 'customerSource';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["customerSource"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["customerSource"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
};

export type CopperV1LeadCreateConfig = {
	resource: 'lead';
	operation: 'create';
/**
 * Name of the lead to create
 * @displayOptions.show { resource: ["lead"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1LeadDeleteConfig = {
	resource: 'lead';
	operation: 'delete';
/**
 * ID of the lead to delete
 * @displayOptions.show { resource: ["lead"], operation: ["delete"] }
 */
		leadId: string | Expression<string>;
};

export type CopperV1LeadGetConfig = {
	resource: 'lead';
	operation: 'get';
/**
 * ID of the lead to retrieve
 * @displayOptions.show { resource: ["lead"], operation: ["get"] }
 */
		leadId: string | Expression<string>;
};

export type CopperV1LeadGetAllConfig = {
	resource: 'lead';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["lead"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["lead"], operation: ["update"] }
 */
		leadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
/**
 * Name of the opportunity to create
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * ID of the customer source that generated this opportunity
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		customerSourceId?: string | Expression<string>;
/**
 * ID of the primary company associated with this opportunity
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		primaryContactId?: string | Expression<string>;
};

export type CopperV1OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
/**
 * ID of the opportunity to delete
 * @displayOptions.show { resource: ["opportunity"], operation: ["delete"] }
 */
		opportunityId: string | Expression<string>;
};

export type CopperV1OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
/**
 * ID of the opportunity to retrieve
 * @displayOptions.show { resource: ["opportunity"], operation: ["get"] }
 */
		opportunityId: string | Expression<string>;
};

export type CopperV1OpportunityGetAllConfig = {
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
 * @displayOptions.show { resource: ["opportunity"], operation: ["update"] }
 */
		opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1PersonCreateConfig = {
	resource: 'person';
	operation: 'create';
/**
 * Name of the person to create
 * @displayOptions.show { resource: ["person"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1PersonDeleteConfig = {
	resource: 'person';
	operation: 'delete';
/**
 * ID of the person to delete
 * @displayOptions.show { resource: ["person"], operation: ["delete"] }
 */
		personId: string | Expression<string>;
};

export type CopperV1PersonGetConfig = {
	resource: 'person';
	operation: 'get';
/**
 * ID of the person to retrieve
 * @displayOptions.show { resource: ["person"], operation: ["get"] }
 */
		personId: string | Expression<string>;
};

export type CopperV1PersonGetAllConfig = {
	resource: 'person';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["person"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["person"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["person"], operation: ["update"] }
 */
		personId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
/**
 * Name of the project to create
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CopperV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
/**
 * ID of the project to delete
 * @displayOptions.show { resource: ["project"], operation: ["delete"] }
 */
		projectId: string | Expression<string>;
};

export type CopperV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
/**
 * ID of the project to retrieve
 * @displayOptions.show { resource: ["project"], operation: ["get"] }
 */
		projectId: string | Expression<string>;
};

export type CopperV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["project"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["project"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["project"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		taskId: string | Expression<string>;
};

export type CopperV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * ID of the task to retrieve
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		taskId: string | Expression<string>;
};

export type CopperV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type CopperV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
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
	| CopperV1UserGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CopperV1Credentials {
	copperApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CopperV1Node = {
	type: 'n8n-nodes-base.copper';
	version: 1;
	config: NodeConfig<CopperV1Params>;
	credentials?: CopperV1Credentials;
};