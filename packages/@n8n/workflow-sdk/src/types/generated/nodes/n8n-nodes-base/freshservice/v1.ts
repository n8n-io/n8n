/**
 * Freshservice Node - Version 1
 * Consume the Freshservice API
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
// Output Types
// ===========================================================================

export type FreshserviceV1TicketGetOutput = {
	attachments?: Array<{
		attachment_url?: string;
		content_type?: string;
		created_at?: string;
		id?: number;
		name?: string;
		size?: number;
		updated_at?: string;
	}>;
	cc_emails?: Array<string>;
	created_at?: string;
	created_within_business_hours?: boolean;
	custom_fields?: {
		business_impact?: null;
		impacted_locations?: null;
		major_incident_type?: null;
		no_of_customers_impacted?: null;
		ticket_has_been_triaged?: null;
	};
	deleted?: boolean;
	description?: string;
	description_text?: string;
	due_by?: string;
	fr_due_by?: string;
	fr_escalated?: boolean;
	id?: number;
	impact?: number;
	is_escalated?: boolean;
	priority?: number;
	reply_cc_emails?: Array<string>;
	requested_for_id?: number;
	requester_id?: number;
	resolution_notes?: null;
	resolution_notes_html?: null;
	sla_policy_id?: number;
	source?: number;
	spam?: boolean;
	status?: number;
	subject?: string;
	tasks_dependency_type?: number;
	type?: string;
	updated_at?: string;
	urgency?: number;
	workspace_id?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface FreshserviceV1Credentials {
	freshserviceApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FreshserviceV1NodeBase {
	type: 'n8n-nodes-base.freshservice';
	version: 1;
	credentials?: FreshserviceV1Credentials;
}

export type FreshserviceV1AgentCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentCreateConfig>;
};

export type FreshserviceV1AgentDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentDeleteConfig>;
};

export type FreshserviceV1AgentGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGetConfig>;
};

export type FreshserviceV1AgentGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGetAllConfig>;
};

export type FreshserviceV1AgentUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentUpdateConfig>;
};

export type FreshserviceV1AgentGroupCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGroupCreateConfig>;
};

export type FreshserviceV1AgentGroupDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGroupDeleteConfig>;
};

export type FreshserviceV1AgentGroupGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGroupGetConfig>;
};

export type FreshserviceV1AgentGroupGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGroupGetAllConfig>;
};

export type FreshserviceV1AgentGroupUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentGroupUpdateConfig>;
};

export type FreshserviceV1AgentRoleGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentRoleGetConfig>;
};

export type FreshserviceV1AgentRoleGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AgentRoleGetAllConfig>;
};

export type FreshserviceV1AnnouncementCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AnnouncementCreateConfig>;
};

export type FreshserviceV1AnnouncementDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AnnouncementDeleteConfig>;
};

export type FreshserviceV1AnnouncementGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AnnouncementGetConfig>;
};

export type FreshserviceV1AnnouncementGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AnnouncementGetAllConfig>;
};

export type FreshserviceV1AnnouncementUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AnnouncementUpdateConfig>;
};

export type FreshserviceV1AssetTypeCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AssetTypeCreateConfig>;
};

export type FreshserviceV1AssetTypeDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AssetTypeDeleteConfig>;
};

export type FreshserviceV1AssetTypeGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AssetTypeGetConfig>;
};

export type FreshserviceV1AssetTypeGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AssetTypeGetAllConfig>;
};

export type FreshserviceV1AssetTypeUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1AssetTypeUpdateConfig>;
};

export type FreshserviceV1ChangeCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ChangeCreateConfig>;
};

export type FreshserviceV1ChangeDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ChangeDeleteConfig>;
};

export type FreshserviceV1ChangeGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ChangeGetConfig>;
};

export type FreshserviceV1ChangeGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ChangeGetAllConfig>;
};

export type FreshserviceV1ChangeUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ChangeUpdateConfig>;
};

export type FreshserviceV1DepartmentCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1DepartmentCreateConfig>;
};

export type FreshserviceV1DepartmentDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1DepartmentDeleteConfig>;
};

export type FreshserviceV1DepartmentGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1DepartmentGetConfig>;
};

export type FreshserviceV1DepartmentGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1DepartmentGetAllConfig>;
};

export type FreshserviceV1DepartmentUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1DepartmentUpdateConfig>;
};

export type FreshserviceV1LocationCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1LocationCreateConfig>;
};

export type FreshserviceV1LocationDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1LocationDeleteConfig>;
};

export type FreshserviceV1LocationGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1LocationGetConfig>;
};

export type FreshserviceV1LocationGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1LocationGetAllConfig>;
};

export type FreshserviceV1LocationUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1LocationUpdateConfig>;
};

export type FreshserviceV1ProblemCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProblemCreateConfig>;
};

export type FreshserviceV1ProblemDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProblemDeleteConfig>;
};

export type FreshserviceV1ProblemGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProblemGetConfig>;
};

export type FreshserviceV1ProblemGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProblemGetAllConfig>;
};

export type FreshserviceV1ProblemUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProblemUpdateConfig>;
};

export type FreshserviceV1ProductCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProductCreateConfig>;
};

export type FreshserviceV1ProductDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProductDeleteConfig>;
};

export type FreshserviceV1ProductGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProductGetConfig>;
};

export type FreshserviceV1ProductGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProductGetAllConfig>;
};

export type FreshserviceV1ProductUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ProductUpdateConfig>;
};

export type FreshserviceV1ReleaseCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ReleaseCreateConfig>;
};

export type FreshserviceV1ReleaseDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ReleaseDeleteConfig>;
};

export type FreshserviceV1ReleaseGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ReleaseGetConfig>;
};

export type FreshserviceV1ReleaseGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ReleaseGetAllConfig>;
};

export type FreshserviceV1ReleaseUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1ReleaseUpdateConfig>;
};

export type FreshserviceV1RequesterCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterCreateConfig>;
};

export type FreshserviceV1RequesterDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterDeleteConfig>;
};

export type FreshserviceV1RequesterGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGetConfig>;
};

export type FreshserviceV1RequesterGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGetAllConfig>;
};

export type FreshserviceV1RequesterUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterUpdateConfig>;
};

export type FreshserviceV1RequesterGroupCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGroupCreateConfig>;
};

export type FreshserviceV1RequesterGroupDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGroupDeleteConfig>;
};

export type FreshserviceV1RequesterGroupGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGroupGetConfig>;
};

export type FreshserviceV1RequesterGroupGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGroupGetAllConfig>;
};

export type FreshserviceV1RequesterGroupUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1RequesterGroupUpdateConfig>;
};

export type FreshserviceV1SoftwareCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1SoftwareCreateConfig>;
};

export type FreshserviceV1SoftwareDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1SoftwareDeleteConfig>;
};

export type FreshserviceV1SoftwareGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1SoftwareGetConfig>;
};

export type FreshserviceV1SoftwareGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1SoftwareGetAllConfig>;
};

export type FreshserviceV1SoftwareUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1SoftwareUpdateConfig>;
};

export type FreshserviceV1TicketCreateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1TicketCreateConfig>;
};

export type FreshserviceV1TicketDeleteNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1TicketDeleteConfig>;
};

export type FreshserviceV1TicketGetNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1TicketGetConfig>;
	output?: FreshserviceV1TicketGetOutput;
};

export type FreshserviceV1TicketGetAllNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1TicketGetAllConfig>;
};

export type FreshserviceV1TicketUpdateNode = FreshserviceV1NodeBase & {
	config: NodeConfig<FreshserviceV1TicketUpdateConfig>;
};

export type FreshserviceV1Node =
	| FreshserviceV1AgentCreateNode
	| FreshserviceV1AgentDeleteNode
	| FreshserviceV1AgentGetNode
	| FreshserviceV1AgentGetAllNode
	| FreshserviceV1AgentUpdateNode
	| FreshserviceV1AgentGroupCreateNode
	| FreshserviceV1AgentGroupDeleteNode
	| FreshserviceV1AgentGroupGetNode
	| FreshserviceV1AgentGroupGetAllNode
	| FreshserviceV1AgentGroupUpdateNode
	| FreshserviceV1AgentRoleGetNode
	| FreshserviceV1AgentRoleGetAllNode
	| FreshserviceV1AnnouncementCreateNode
	| FreshserviceV1AnnouncementDeleteNode
	| FreshserviceV1AnnouncementGetNode
	| FreshserviceV1AnnouncementGetAllNode
	| FreshserviceV1AnnouncementUpdateNode
	| FreshserviceV1AssetTypeCreateNode
	| FreshserviceV1AssetTypeDeleteNode
	| FreshserviceV1AssetTypeGetNode
	| FreshserviceV1AssetTypeGetAllNode
	| FreshserviceV1AssetTypeUpdateNode
	| FreshserviceV1ChangeCreateNode
	| FreshserviceV1ChangeDeleteNode
	| FreshserviceV1ChangeGetNode
	| FreshserviceV1ChangeGetAllNode
	| FreshserviceV1ChangeUpdateNode
	| FreshserviceV1DepartmentCreateNode
	| FreshserviceV1DepartmentDeleteNode
	| FreshserviceV1DepartmentGetNode
	| FreshserviceV1DepartmentGetAllNode
	| FreshserviceV1DepartmentUpdateNode
	| FreshserviceV1LocationCreateNode
	| FreshserviceV1LocationDeleteNode
	| FreshserviceV1LocationGetNode
	| FreshserviceV1LocationGetAllNode
	| FreshserviceV1LocationUpdateNode
	| FreshserviceV1ProblemCreateNode
	| FreshserviceV1ProblemDeleteNode
	| FreshserviceV1ProblemGetNode
	| FreshserviceV1ProblemGetAllNode
	| FreshserviceV1ProblemUpdateNode
	| FreshserviceV1ProductCreateNode
	| FreshserviceV1ProductDeleteNode
	| FreshserviceV1ProductGetNode
	| FreshserviceV1ProductGetAllNode
	| FreshserviceV1ProductUpdateNode
	| FreshserviceV1ReleaseCreateNode
	| FreshserviceV1ReleaseDeleteNode
	| FreshserviceV1ReleaseGetNode
	| FreshserviceV1ReleaseGetAllNode
	| FreshserviceV1ReleaseUpdateNode
	| FreshserviceV1RequesterCreateNode
	| FreshserviceV1RequesterDeleteNode
	| FreshserviceV1RequesterGetNode
	| FreshserviceV1RequesterGetAllNode
	| FreshserviceV1RequesterUpdateNode
	| FreshserviceV1RequesterGroupCreateNode
	| FreshserviceV1RequesterGroupDeleteNode
	| FreshserviceV1RequesterGroupGetNode
	| FreshserviceV1RequesterGroupGetAllNode
	| FreshserviceV1RequesterGroupUpdateNode
	| FreshserviceV1SoftwareCreateNode
	| FreshserviceV1SoftwareDeleteNode
	| FreshserviceV1SoftwareGetNode
	| FreshserviceV1SoftwareGetAllNode
	| FreshserviceV1SoftwareUpdateNode
	| FreshserviceV1TicketCreateNode
	| FreshserviceV1TicketDeleteNode
	| FreshserviceV1TicketGetNode
	| FreshserviceV1TicketGetAllNode
	| FreshserviceV1TicketUpdateNode
	;