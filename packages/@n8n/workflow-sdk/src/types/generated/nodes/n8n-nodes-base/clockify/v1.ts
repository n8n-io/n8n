/**
 * Clockify Node - Version 1
 * Consume Clockify REST API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a client */
export type ClockifyV1ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
/**
 * Name of client being created
 * @displayOptions.show { resource: ["client"], operation: ["create"] }
 */
		name: string | Expression<string>;
};

/** Delete a client */
export type ClockifyV1ClientDeleteConfig = {
	resource: 'client';
	operation: 'delete';
	clientId?: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1ClientGetConfig = {
	resource: 'client';
	operation: 'get';
	clientId?: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1ClientGetAllConfig = {
	resource: 'client';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["client"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["client"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1ClientUpdateConfig = {
	resource: 'client';
	operation: 'update';
	clientId?: string | Expression<string>;
	name: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
/**
 * Name of project being created
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type ClockifyV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
	projectId: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	projectId: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["project"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["project"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
	projectId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
/**
 * Name of tag being created
 * @displayOptions.show { resource: ["tag"], operation: ["create"] }
 */
		name: string | Expression<string>;
};

/** Delete a client */
export type ClockifyV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
	tagId: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1TagUpdateConfig = {
	resource: 'tag';
	operation: 'update';
	tagId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * Name of task to create
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type ClockifyV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of task to delete
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		taskId: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of task to get
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		taskId: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["task"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of task to update
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1TimeEntryCreateConfig = {
	resource: 'timeEntry';
	operation: 'create';
	start: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type ClockifyV1TimeEntryDeleteConfig = {
	resource: 'timeEntry';
	operation: 'delete';
	timeEntryId: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1TimeEntryGetConfig = {
	resource: 'timeEntry';
	operation: 'get';
	timeEntryId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1TimeEntryUpdateConfig = {
	resource: 'timeEntry';
	operation: 'update';
	timeEntryId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get many clients */
export type ClockifyV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["user"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["user"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get many clients */
export type ClockifyV1WorkspaceGetAllConfig = {
	resource: 'workspace';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["workspace"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["workspace"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type ClockifyV1Params =
	| ClockifyV1ClientCreateConfig
	| ClockifyV1ClientDeleteConfig
	| ClockifyV1ClientGetConfig
	| ClockifyV1ClientGetAllConfig
	| ClockifyV1ClientUpdateConfig
	| ClockifyV1ProjectCreateConfig
	| ClockifyV1ProjectDeleteConfig
	| ClockifyV1ProjectGetConfig
	| ClockifyV1ProjectGetAllConfig
	| ClockifyV1ProjectUpdateConfig
	| ClockifyV1TagCreateConfig
	| ClockifyV1TagDeleteConfig
	| ClockifyV1TagGetAllConfig
	| ClockifyV1TagUpdateConfig
	| ClockifyV1TaskCreateConfig
	| ClockifyV1TaskDeleteConfig
	| ClockifyV1TaskGetConfig
	| ClockifyV1TaskGetAllConfig
	| ClockifyV1TaskUpdateConfig
	| ClockifyV1TimeEntryCreateConfig
	| ClockifyV1TimeEntryDeleteConfig
	| ClockifyV1TimeEntryGetConfig
	| ClockifyV1TimeEntryUpdateConfig
	| ClockifyV1UserGetAllConfig
	| ClockifyV1WorkspaceGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClockifyV1Credentials {
	clockifyApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ClockifyV1Node = {
	type: 'n8n-nodes-base.clockify';
	version: 1;
	config: NodeConfig<ClockifyV1Params>;
	credentials?: ClockifyV1Credentials;
};