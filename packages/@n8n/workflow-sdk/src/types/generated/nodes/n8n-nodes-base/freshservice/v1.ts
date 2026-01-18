/**
 * Freshservice Node - Version 1
 * Consume the Freshservice API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an agent */
export type FreshserviceV1AgentCreateConfig = {
	resource: 'agent';
	operation: 'create';
	email: string | Expression<string>;
	firstName: string | Expression<string>;
/**
 * Role to assign to the agent
 * @displayOptions.show { resource: ["agent"], operation: ["create"] }
 * @default {}
 */
		roles: {
		roleProperties?: Array<{
			/** Name of the role to assign to the agent. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			role?: string | Expression<string>;
			/** Scope in which the agent may use the permissions granted by the role
			 * @default specified_groups
			 */
			assignment_scope?: 'entire_helpdesk' | 'member_groups' | 'specified_groups' | 'assigned_items' | Expression<string>;
			/** Groups in which the permissions granted by the role apply. Required only when Scope is Specified Groups - ignored otherwise. Choose from the list or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 * @default []
			 */
			groups?: string[];
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1AgentDeleteConfig = {
	resource: 'agent';
	operation: 'delete';
/**
 * ID of the agent to delete
 * @displayOptions.show { resource: ["agent"], operation: ["delete"] }
 */
		agentId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1AgentGetConfig = {
	resource: 'agent';
	operation: 'get';
/**
 * ID of the agent to retrieve
 * @displayOptions.show { resource: ["agent"], operation: ["get"] }
 */
		agentId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1AgentGetAllConfig = {
	resource: 'agent';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["agent"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["agent"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an agent */
export type FreshserviceV1AgentUpdateConfig = {
	resource: 'agent';
	operation: 'update';
/**
 * ID of the agent to update
 * @displayOptions.show { resource: ["agent"], operation: ["update"] }
 */
		agentId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1AgentGroupCreateConfig = {
	resource: 'agentGroup';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1AgentGroupDeleteConfig = {
	resource: 'agentGroup';
	operation: 'delete';
/**
 * ID of the agent group to delete
 * @displayOptions.show { resource: ["agentGroup"], operation: ["delete"] }
 */
		agentGroupId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1AgentGroupGetConfig = {
	resource: 'agentGroup';
	operation: 'get';
/**
 * ID of the agent group to retrieve
 * @displayOptions.show { resource: ["agentGroup"], operation: ["get"] }
 */
		agentGroupId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1AgentGroupGetAllConfig = {
	resource: 'agentGroup';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["agentGroup"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["agentGroup"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1AgentGroupUpdateConfig = {
	resource: 'agentGroup';
	operation: 'update';
/**
 * ID of the agent group to update
 * @displayOptions.show { resource: ["agentGroup"], operation: ["update"] }
 */
		agentGroupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Retrieve an agent */
export type FreshserviceV1AgentRoleGetConfig = {
	resource: 'agentRole';
	operation: 'get';
/**
 * ID of the agent role to retrieve
 * @displayOptions.show { resource: ["agentRole"], operation: ["get"] }
 */
		agentRoleId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1AgentRoleGetAllConfig = {
	resource: 'agentRole';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["agentRole"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["agentRole"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create an agent */
export type FreshserviceV1AnnouncementCreateConfig = {
	resource: 'announcement';
	operation: 'create';
	title: string | Expression<string>;
/**
 * HTML supported
 * @displayOptions.show { resource: ["announcement"], operation: ["create"] }
 */
		bodyHtml: string | Expression<string>;
	visibility: 'agents_only' | 'grouped_visibility' | 'everyone' | Expression<string>;
/**
 * Timestamp at which announcement becomes active
 * @displayOptions.show { resource: ["announcement"], operation: ["create"] }
 */
		visibleFrom: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1AnnouncementDeleteConfig = {
	resource: 'announcement';
	operation: 'delete';
/**
 * ID of the announcement to delete
 * @displayOptions.show { resource: ["announcement"], operation: ["delete"] }
 */
		announcementId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1AnnouncementGetConfig = {
	resource: 'announcement';
	operation: 'get';
/**
 * ID of the announcement to retrieve
 * @displayOptions.show { resource: ["announcement"], operation: ["get"] }
 */
		announcementId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1AnnouncementGetAllConfig = {
	resource: 'announcement';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["announcement"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["announcement"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1AnnouncementUpdateConfig = {
	resource: 'announcement';
	operation: 'update';
/**
 * ID of the announcement to update
 * @displayOptions.show { resource: ["announcement"], operation: ["update"] }
 */
		announcementId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1AssetTypeCreateConfig = {
	resource: 'assetType';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1AssetTypeDeleteConfig = {
	resource: 'assetType';
	operation: 'delete';
/**
 * ID of the asset type to delete
 * @displayOptions.show { resource: ["assetType"], operation: ["delete"] }
 */
		assetTypeId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1AssetTypeGetConfig = {
	resource: 'assetType';
	operation: 'get';
/**
 * ID of the asset type to retrieve
 * @displayOptions.show { resource: ["assetType"], operation: ["get"] }
 */
		assetTypeId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1AssetTypeGetAllConfig = {
	resource: 'assetType';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["assetType"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["assetType"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1AssetTypeUpdateConfig = {
	resource: 'assetType';
	operation: 'update';
/**
 * ID of the asset type to update
 * @displayOptions.show { resource: ["assetType"], operation: ["update"] }
 */
		assetTypeId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1ChangeCreateConfig = {
	resource: 'change';
	operation: 'create';
/**
 * ID of the requester of the change. Choose from the list or specify an ID. You can also specify the ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["change"], operation: ["create"] }
 */
		requesterId: string | Expression<string>;
	subject: string | Expression<string>;
	plannedStartDate: string | Expression<string>;
	plannedEndDate: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1ChangeDeleteConfig = {
	resource: 'change';
	operation: 'delete';
/**
 * ID of the change to delete
 * @displayOptions.show { resource: ["change"], operation: ["delete"] }
 */
		changeId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1ChangeGetConfig = {
	resource: 'change';
	operation: 'get';
/**
 * ID of the change to retrieve
 * @displayOptions.show { resource: ["change"], operation: ["get"] }
 */
		changeId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1ChangeGetAllConfig = {
	resource: 'change';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["change"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["change"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an agent */
export type FreshserviceV1ChangeUpdateConfig = {
	resource: 'change';
	operation: 'update';
/**
 * ID of the change to update
 * @displayOptions.show { resource: ["change"], operation: ["update"] }
 */
		changeId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1DepartmentCreateConfig = {
	resource: 'department';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1DepartmentDeleteConfig = {
	resource: 'department';
	operation: 'delete';
/**
 * ID of the department to delete
 * @displayOptions.show { resource: ["department"], operation: ["delete"] }
 */
		departmentId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1DepartmentGetConfig = {
	resource: 'department';
	operation: 'get';
/**
 * ID of the department to retrieve
 * @displayOptions.show { resource: ["department"], operation: ["get"] }
 */
		departmentId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1DepartmentGetAllConfig = {
	resource: 'department';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["department"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["department"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an agent */
export type FreshserviceV1DepartmentUpdateConfig = {
	resource: 'department';
	operation: 'update';
/**
 * ID of the department to update
 * @displayOptions.show { resource: ["department"], operation: ["update"] }
 */
		departmentId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1LocationCreateConfig = {
	resource: 'location';
	operation: 'create';
/**
 * Name of the location
 * @displayOptions.show { resource: ["location"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1LocationDeleteConfig = {
	resource: 'location';
	operation: 'delete';
/**
 * ID of the location to delete
 * @displayOptions.show { resource: ["location"], operation: ["delete"] }
 */
		locationId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1LocationGetConfig = {
	resource: 'location';
	operation: 'get';
/**
 * ID of the location to retrieve
 * @displayOptions.show { resource: ["location"], operation: ["get"] }
 */
		locationId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1LocationGetAllConfig = {
	resource: 'location';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["location"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["location"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1LocationUpdateConfig = {
	resource: 'location';
	operation: 'update';
/**
 * ID of the location to update
 * @displayOptions.show { resource: ["location"], operation: ["update"] }
 */
		locationId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1ProblemCreateConfig = {
	resource: 'problem';
	operation: 'create';
	subject: string | Expression<string>;
/**
 * ID of the initiator of the problem. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["problem"], operation: ["create"] }
 */
		requesterId: string | Expression<string>;
/**
 * Date when the problem is due to be solved
 * @displayOptions.show { resource: ["problem"], operation: ["create"] }
 */
		dueBy?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1ProblemDeleteConfig = {
	resource: 'problem';
	operation: 'delete';
/**
 * ID of the problem to delete
 * @displayOptions.show { resource: ["problem"], operation: ["delete"] }
 */
		problemId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1ProblemGetConfig = {
	resource: 'problem';
	operation: 'get';
/**
 * ID of the problem to retrieve
 * @displayOptions.show { resource: ["problem"], operation: ["get"] }
 */
		problemId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1ProblemGetAllConfig = {
	resource: 'problem';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["problem"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["problem"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1ProblemUpdateConfig = {
	resource: 'problem';
	operation: 'update';
/**
 * ID of the problem to update
 * @displayOptions.show { resource: ["problem"], operation: ["update"] }
 */
		problemId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1ProductCreateConfig = {
	resource: 'product';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["product"], operation: ["create"] }
 */
		assetTypeId: string | Expression<string>;
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1ProductDeleteConfig = {
	resource: 'product';
	operation: 'delete';
/**
 * ID of the product to delete
 * @displayOptions.show { resource: ["product"], operation: ["delete"] }
 */
		productId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1ProductGetConfig = {
	resource: 'product';
	operation: 'get';
/**
 * ID of the product to retrieve
 * @displayOptions.show { resource: ["product"], operation: ["get"] }
 */
		productId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1ProductGetAllConfig = {
	resource: 'product';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["product"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["product"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1ProductUpdateConfig = {
	resource: 'product';
	operation: 'update';
/**
 * ID of the product to update
 * @displayOptions.show { resource: ["product"], operation: ["update"] }
 */
		productId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1ReleaseCreateConfig = {
	resource: 'release';
	operation: 'create';
	subject: string | Expression<string>;
	releaseType?: 1 | 2 | 3 | 4 | Expression<number>;
	priority?: 1 | 2 | 3 | 4 | Expression<number>;
	status?: 1 | 2 | 3 | 4 | 5 | Expression<number>;
	plannedStartDate: string | Expression<string>;
	plannedEndDate: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1ReleaseDeleteConfig = {
	resource: 'release';
	operation: 'delete';
/**
 * ID of the release to delete
 * @displayOptions.show { resource: ["release"], operation: ["delete"] }
 */
		releaseId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1ReleaseGetConfig = {
	resource: 'release';
	operation: 'get';
/**
 * ID of the release to retrieve
 * @displayOptions.show { resource: ["release"], operation: ["get"] }
 */
		releaseId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1ReleaseGetAllConfig = {
	resource: 'release';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["release"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["release"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1ReleaseUpdateConfig = {
	resource: 'release';
	operation: 'update';
/**
 * ID of the release to update
 * @displayOptions.show { resource: ["release"], operation: ["update"] }
 */
		releaseId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1RequesterCreateConfig = {
	resource: 'requester';
	operation: 'create';
	firstName: string | Expression<string>;
	primaryEmail?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1RequesterDeleteConfig = {
	resource: 'requester';
	operation: 'delete';
/**
 * ID of the requester to delete
 * @displayOptions.show { resource: ["requester"], operation: ["delete"] }
 */
		requesterId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1RequesterGetConfig = {
	resource: 'requester';
	operation: 'get';
/**
 * ID of the requester to retrieve
 * @displayOptions.show { resource: ["requester"], operation: ["get"] }
 */
		requesterId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1RequesterGetAllConfig = {
	resource: 'requester';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["requester"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["requester"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an agent */
export type FreshserviceV1RequesterUpdateConfig = {
	resource: 'requester';
	operation: 'update';
/**
 * ID of the requester to update
 * @displayOptions.show { resource: ["requester"], operation: ["update"] }
 */
		requesterId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1RequesterGroupCreateConfig = {
	resource: 'requesterGroup';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1RequesterGroupDeleteConfig = {
	resource: 'requesterGroup';
	operation: 'delete';
/**
 * ID of the requester group to delete
 * @displayOptions.show { resource: ["requesterGroup"], operation: ["delete"] }
 */
		requesterGroupId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1RequesterGroupGetConfig = {
	resource: 'requesterGroup';
	operation: 'get';
/**
 * ID of the requester group to retrieve
 * @displayOptions.show { resource: ["requesterGroup"], operation: ["get"] }
 */
		requesterGroupId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1RequesterGroupGetAllConfig = {
	resource: 'requesterGroup';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["requesterGroup"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["requesterGroup"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1RequesterGroupUpdateConfig = {
	resource: 'requesterGroup';
	operation: 'update';
/**
 * ID of the requester group to update
 * @displayOptions.show { resource: ["requesterGroup"], operation: ["update"] }
 */
		requesterGroupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1SoftwareCreateConfig = {
	resource: 'software';
	operation: 'create';
	applicationType: 'desktop' | 'mobile' | 'saas' | Expression<string>;
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1SoftwareDeleteConfig = {
	resource: 'software';
	operation: 'delete';
/**
 * ID of the software application to delete
 * @displayOptions.show { resource: ["software"], operation: ["delete"] }
 */
		softwareId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1SoftwareGetConfig = {
	resource: 'software';
	operation: 'get';
/**
 * ID of the software application to retrieve
 * @displayOptions.show { resource: ["software"], operation: ["get"] }
 */
		softwareId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1SoftwareGetAllConfig = {
	resource: 'software';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["software"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["software"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update an agent */
export type FreshserviceV1SoftwareUpdateConfig = {
	resource: 'software';
	operation: 'update';
/**
 * ID of the software application to update
 * @displayOptions.show { resource: ["software"], operation: ["update"] }
 */
		softwareId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an agent */
export type FreshserviceV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
/**
 * Email address of the ticket author
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		email: string | Expression<string>;
	subject?: string | Expression<string>;
/**
 * HTML supported
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		description?: string | Expression<string>;
	priority?: 1 | 2 | 3 | 4 | Expression<number>;
	status?: 2 | 3 | 4 | 5 | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an agent */
export type FreshserviceV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
/**
 * ID of the ticket to delete
 * @displayOptions.show { resource: ["ticket"], operation: ["delete"] }
 */
		ticketId: string | Expression<string>;
};

/** Retrieve an agent */
export type FreshserviceV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
/**
 * ID of the ticket to retrieve
 * @displayOptions.show { resource: ["ticket"], operation: ["get"] }
 */
		ticketId: string | Expression<string>;
};

/** Retrieve many agents */
export type FreshserviceV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an agent */
export type FreshserviceV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
/**
 * ID of the ticket to update
 * @displayOptions.show { resource: ["ticket"], operation: ["update"] }
 */
		ticketId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type FreshserviceV1Params =
	| FreshserviceV1AgentCreateConfig
	| FreshserviceV1AgentDeleteConfig
	| FreshserviceV1AgentGetConfig
	| FreshserviceV1AgentGetAllConfig
	| FreshserviceV1AgentUpdateConfig
	| FreshserviceV1AgentGroupCreateConfig
	| FreshserviceV1AgentGroupDeleteConfig
	| FreshserviceV1AgentGroupGetConfig
	| FreshserviceV1AgentGroupGetAllConfig
	| FreshserviceV1AgentGroupUpdateConfig
	| FreshserviceV1AgentRoleGetConfig
	| FreshserviceV1AgentRoleGetAllConfig
	| FreshserviceV1AnnouncementCreateConfig
	| FreshserviceV1AnnouncementDeleteConfig
	| FreshserviceV1AnnouncementGetConfig
	| FreshserviceV1AnnouncementGetAllConfig
	| FreshserviceV1AnnouncementUpdateConfig
	| FreshserviceV1AssetTypeCreateConfig
	| FreshserviceV1AssetTypeDeleteConfig
	| FreshserviceV1AssetTypeGetConfig
	| FreshserviceV1AssetTypeGetAllConfig
	| FreshserviceV1AssetTypeUpdateConfig
	| FreshserviceV1ChangeCreateConfig
	| FreshserviceV1ChangeDeleteConfig
	| FreshserviceV1ChangeGetConfig
	| FreshserviceV1ChangeGetAllConfig
	| FreshserviceV1ChangeUpdateConfig
	| FreshserviceV1DepartmentCreateConfig
	| FreshserviceV1DepartmentDeleteConfig
	| FreshserviceV1DepartmentGetConfig
	| FreshserviceV1DepartmentGetAllConfig
	| FreshserviceV1DepartmentUpdateConfig
	| FreshserviceV1LocationCreateConfig
	| FreshserviceV1LocationDeleteConfig
	| FreshserviceV1LocationGetConfig
	| FreshserviceV1LocationGetAllConfig
	| FreshserviceV1LocationUpdateConfig
	| FreshserviceV1ProblemCreateConfig
	| FreshserviceV1ProblemDeleteConfig
	| FreshserviceV1ProblemGetConfig
	| FreshserviceV1ProblemGetAllConfig
	| FreshserviceV1ProblemUpdateConfig
	| FreshserviceV1ProductCreateConfig
	| FreshserviceV1ProductDeleteConfig
	| FreshserviceV1ProductGetConfig
	| FreshserviceV1ProductGetAllConfig
	| FreshserviceV1ProductUpdateConfig
	| FreshserviceV1ReleaseCreateConfig
	| FreshserviceV1ReleaseDeleteConfig
	| FreshserviceV1ReleaseGetConfig
	| FreshserviceV1ReleaseGetAllConfig
	| FreshserviceV1ReleaseUpdateConfig
	| FreshserviceV1RequesterCreateConfig
	| FreshserviceV1RequesterDeleteConfig
	| FreshserviceV1RequesterGetConfig
	| FreshserviceV1RequesterGetAllConfig
	| FreshserviceV1RequesterUpdateConfig
	| FreshserviceV1RequesterGroupCreateConfig
	| FreshserviceV1RequesterGroupDeleteConfig
	| FreshserviceV1RequesterGroupGetConfig
	| FreshserviceV1RequesterGroupGetAllConfig
	| FreshserviceV1RequesterGroupUpdateConfig
	| FreshserviceV1SoftwareCreateConfig
	| FreshserviceV1SoftwareDeleteConfig
	| FreshserviceV1SoftwareGetConfig
	| FreshserviceV1SoftwareGetAllConfig
	| FreshserviceV1SoftwareUpdateConfig
	| FreshserviceV1TicketCreateConfig
	| FreshserviceV1TicketDeleteConfig
	| FreshserviceV1TicketGetConfig
	| FreshserviceV1TicketGetAllConfig
	| FreshserviceV1TicketUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface FreshserviceV1Credentials {
	freshserviceApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FreshserviceV1Node = {
	type: 'n8n-nodes-base.freshservice';
	version: 1;
	config: NodeConfig<FreshserviceV1Params>;
	credentials?: FreshserviceV1Credentials;
};