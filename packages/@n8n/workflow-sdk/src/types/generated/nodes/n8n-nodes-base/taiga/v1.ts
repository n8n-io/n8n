/**
 * Taiga Node - Version 1
 * Consume Taiga API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an epic */
export type TaigaV1EpicCreateConfig = {
	resource: 'epic';
	operation: 'create';
/**
 * ID of the project to which the epic belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["epic"], operation: ["create"] }
 */
		projectId: string | Expression<string>;
	subject: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an epic */
export type TaigaV1EpicDeleteConfig = {
	resource: 'epic';
	operation: 'delete';
/**
 * ID of the epic to delete
 * @displayOptions.show { resource: ["epic"], operation: ["delete"] }
 */
		epicId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1EpicGetConfig = {
	resource: 'epic';
	operation: 'get';
/**
 * ID of the epic to retrieve
 * @displayOptions.show { resource: ["epic"], operation: ["get"] }
 */
		epicId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1EpicGetAllConfig = {
	resource: 'epic';
	operation: 'getAll';
/**
 * ID of the project to which the epic belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["epic"], operation: ["getAll"] }
 */
		projectId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["epic"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["epic"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an epic */
export type TaigaV1EpicUpdateConfig = {
	resource: 'epic';
	operation: 'update';
/**
 * ID of the project to set the epic to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["epic"], operation: ["update"] }
 */
		projectId?: string | Expression<string>;
/**
 * ID of the epic to update
 * @displayOptions.show { resource: ["epic"], operation: ["update"] }
 */
		epicId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an epic */
export type TaigaV1IssueCreateConfig = {
	resource: 'issue';
	operation: 'create';
/**
 * ID of the project to which the issue belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["issue"], operation: ["create"] }
 */
		projectId: string | Expression<string>;
	subject: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an epic */
export type TaigaV1IssueDeleteConfig = {
	resource: 'issue';
	operation: 'delete';
/**
 * ID of the issue to delete
 * @displayOptions.show { resource: ["issue"], operation: ["delete"] }
 */
		issueId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
/**
 * ID of the issue to retrieve
 * @displayOptions.show { resource: ["issue"], operation: ["get"] }
 */
		issueId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1IssueGetAllConfig = {
	resource: 'issue';
	operation: 'getAll';
/**
 * ID of the project to which the issue belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"] }
 */
		projectId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["issue"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an epic */
export type TaigaV1IssueUpdateConfig = {
	resource: 'issue';
	operation: 'update';
/**
 * ID of the project to set the issue to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["issue"], operation: ["update"] }
 */
		projectId?: string | Expression<string>;
/**
 * ID of the issue to update
 * @displayOptions.show { resource: ["issue"], operation: ["update"] }
 */
		issueId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an epic */
export type TaigaV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * ID of the project to which the task belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		projectId: string | Expression<string>;
	subject: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an epic */
export type TaigaV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * ID of the task to delete
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		taskId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * ID of the task to retrieve
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		taskId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * ID of the project to which the task belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 */
		projectId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an epic */
export type TaigaV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * ID of the project to set the task to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		projectId?: string | Expression<string>;
/**
 * ID of the task to update
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an epic */
export type TaigaV1UserStoryCreateConfig = {
	resource: 'userStory';
	operation: 'create';
/**
 * ID of the project to which the user story belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["userStory"], operation: ["create"] }
 */
		projectId: string | Expression<string>;
	subject: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an epic */
export type TaigaV1UserStoryDeleteConfig = {
	resource: 'userStory';
	operation: 'delete';
/**
 * ID of the user story to delete
 * @displayOptions.show { resource: ["userStory"], operation: ["delete"] }
 */
		userStoryId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1UserStoryGetConfig = {
	resource: 'userStory';
	operation: 'get';
/**
 * ID of the user story to retrieve
 * @displayOptions.show { resource: ["userStory"], operation: ["get"] }
 */
		userStoryId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1UserStoryGetAllConfig = {
	resource: 'userStory';
	operation: 'getAll';
/**
 * ID of the project to which the user story belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["userStory"], operation: ["getAll"] }
 */
		projectId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["userStory"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["userStory"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an epic */
export type TaigaV1UserStoryUpdateConfig = {
	resource: 'userStory';
	operation: 'update';
/**
 * ID of the project to set the user story to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["userStory"], operation: ["update"] }
 */
		projectId?: string | Expression<string>;
/**
 * ID of the user story to update
 * @displayOptions.show { resource: ["userStory"], operation: ["update"] }
 */
		userStoryId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface TaigaV1Credentials {
	taigaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TaigaV1NodeBase {
	type: 'n8n-nodes-base.taiga';
	version: 1;
	credentials?: TaigaV1Credentials;
}

export type TaigaV1EpicCreateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1EpicCreateConfig>;
};

export type TaigaV1EpicDeleteNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1EpicDeleteConfig>;
};

export type TaigaV1EpicGetNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1EpicGetConfig>;
};

export type TaigaV1EpicGetAllNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1EpicGetAllConfig>;
};

export type TaigaV1EpicUpdateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1EpicUpdateConfig>;
};

export type TaigaV1IssueCreateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1IssueCreateConfig>;
};

export type TaigaV1IssueDeleteNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1IssueDeleteConfig>;
};

export type TaigaV1IssueGetNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1IssueGetConfig>;
};

export type TaigaV1IssueGetAllNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1IssueGetAllConfig>;
};

export type TaigaV1IssueUpdateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1IssueUpdateConfig>;
};

export type TaigaV1TaskCreateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1TaskCreateConfig>;
};

export type TaigaV1TaskDeleteNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1TaskDeleteConfig>;
};

export type TaigaV1TaskGetNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1TaskGetConfig>;
};

export type TaigaV1TaskGetAllNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1TaskGetAllConfig>;
};

export type TaigaV1TaskUpdateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1TaskUpdateConfig>;
};

export type TaigaV1UserStoryCreateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1UserStoryCreateConfig>;
};

export type TaigaV1UserStoryDeleteNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1UserStoryDeleteConfig>;
};

export type TaigaV1UserStoryGetNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1UserStoryGetConfig>;
};

export type TaigaV1UserStoryGetAllNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1UserStoryGetAllConfig>;
};

export type TaigaV1UserStoryUpdateNode = TaigaV1NodeBase & {
	config: NodeConfig<TaigaV1UserStoryUpdateConfig>;
};

export type TaigaV1Node =
	| TaigaV1EpicCreateNode
	| TaigaV1EpicDeleteNode
	| TaigaV1EpicGetNode
	| TaigaV1EpicGetAllNode
	| TaigaV1EpicUpdateNode
	| TaigaV1IssueCreateNode
	| TaigaV1IssueDeleteNode
	| TaigaV1IssueGetNode
	| TaigaV1IssueGetAllNode
	| TaigaV1IssueUpdateNode
	| TaigaV1TaskCreateNode
	| TaigaV1TaskDeleteNode
	| TaigaV1TaskGetNode
	| TaigaV1TaskGetAllNode
	| TaigaV1TaskUpdateNode
	| TaigaV1UserStoryCreateNode
	| TaigaV1UserStoryDeleteNode
	| TaigaV1UserStoryGetNode
	| TaigaV1UserStoryGetAllNode
	| TaigaV1UserStoryUpdateNode
	;