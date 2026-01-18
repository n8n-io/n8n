/**
 * Asana Node Types
 *
 * Consume Asana REST API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/asana/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a subtask */
export type AsanaV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
	/**
	 * The name of the project to create
	 * @displayOptions.show { operation: ["create"], resource: ["project"] }
	 */
	name: string | Expression<string>;
	/**
	 * The workspace to create the project in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["create"], resource: ["project"] }
	 */
	workspace: string | Expression<string>;
	/**
	 * The team this project will be assigned to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["create"], resource: ["project"] }
	 */
	team?: string | Expression<string>;
	/**
	 * Other properties to set
	 * @displayOptions.show { resource: ["project"], operation: ["create"] }
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Delete a task */
export type AsanaV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Get a task */
export type AsanaV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	id: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
	/**
	 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["getAll"], resource: ["project"] }
	 */
	workspace: string | Expression<string>;
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
	/**
	 * Other properties to set
	 * @displayOptions.show { resource: ["project"], operation: ["getAll"] }
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Update a task */
export type AsanaV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
	/**
	 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["update"], resource: ["project"] }
	 */
	workspace: string | Expression<string>;
	/**
	 * The ID of the project to update the data of
	 * @displayOptions.show { operation: ["update"], resource: ["project"] }
	 */
	id: string | Expression<string>;
	/**
	 * Other properties to set
	 * @displayOptions.show { resource: ["project"], operation: ["update"] }
	 * @default {}
	 */
	updateFields?: Record<string, unknown>;
};

/** Create a subtask */
export type AsanaV1SubtaskCreateConfig = {
	resource: 'subtask';
	operation: 'create';
	/**
	 * The task to operate on
	 * @displayOptions.show { operation: ["create"], resource: ["subtask"] }
	 */
	taskId: string | Expression<string>;
	/**
	 * The name of the subtask to create
	 * @displayOptions.show { operation: ["create"], resource: ["subtask"] }
	 */
	name: string | Expression<string>;
	otherProperties?: Record<string, unknown>;
};

/** Get many subtasks */
export type AsanaV1SubtaskGetAllConfig = {
	resource: 'subtask';
	operation: 'getAll';
	/**
	 * The task to operate on
	 * @displayOptions.show { operation: ["getAll"], resource: ["subtask"] }
	 */
	taskId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["subtask"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["subtask"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a subtask */
export type AsanaV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * The workspace to create the task in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["create"], resource: ["task"] }
	 */
	workspace: string | Expression<string>;
	/**
	 * The name of the task to create
	 * @displayOptions.show { operation: ["create"], resource: ["task"] }
	 */
	name: string | Expression<string>;
	otherProperties?: Record<string, unknown>;
};

/** Delete a task */
export type AsanaV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * The ID of the task to delete
	 * @displayOptions.show { operation: ["delete"], resource: ["task"] }
	 */
	id: string | Expression<string>;
};

/** Get a task */
export type AsanaV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * The ID of the task to get the data of
	 * @displayOptions.show { operation: ["get"], resource: ["task"] }
	 */
	id: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
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
	/**
	 * Properties to search for
	 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
	 * @default {}
	 */
	filters?: Record<string, unknown>;
};

/** Move a task */
export type AsanaV1TaskMoveConfig = {
	resource: 'task';
	operation: 'move';
	/**
	 * The ID of the task to be moved
	 * @displayOptions.show { operation: ["move"], resource: ["task"] }
	 */
	id: string | Expression<string>;
	/**
	 * Project to show the sections of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["move"], resource: ["task"] }
	 */
	projectId: string | Expression<string>;
	/**
	 * The Section to move the task to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["move"], resource: ["task"] }
	 */
	section: string | Expression<string>;
};

/** Search for tasks */
export type AsanaV1TaskSearchConfig = {
	resource: 'task';
	operation: 'search';
	/**
	 * The workspace in which the task is searched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["search"], resource: ["task"] }
	 */
	workspace: string | Expression<string>;
	/**
	 * Properties to search for
	 * @displayOptions.show { operation: ["search"], resource: ["task"] }
	 * @default {}
	 */
	searchTaskProperties?: Record<string, unknown>;
};

/** Update a task */
export type AsanaV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * The ID of the task to update the data of
	 * @displayOptions.show { operation: ["update"], resource: ["task"] }
	 */
	id: string | Expression<string>;
	otherProperties?: Record<string, unknown>;
};

/** Add a comment to a task */
export type AsanaV1TaskCommentAddConfig = {
	resource: 'taskComment';
	operation: 'add';
	/**
	 * The ID of the task to add the comment to
	 * @displayOptions.show { operation: ["add"], resource: ["taskComment"] }
	 */
	id: string | Expression<string>;
	/**
	 * Whether body is HTML or simple text
	 * @displayOptions.show { operation: ["add"], resource: ["taskComment"] }
	 * @default false
	 */
	isTextHtml?: boolean | Expression<boolean>;
	/**
	 * The plain text of the comment to add
	 * @displayOptions.show { operation: ["add"], resource: ["taskComment"], isTextHtml: [false] }
	 */
	text: string | Expression<string>;
	/**
	 * Properties of the task comment
	 * @displayOptions.show { operation: ["add"], resource: ["taskComment"] }
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Remove a comment from a task */
export type AsanaV1TaskCommentRemoveConfig = {
	resource: 'taskComment';
	operation: 'remove';
	/**
	 * The ID of the comment to be removed
	 * @displayOptions.show { operation: ["remove"], resource: ["taskComment"] }
	 */
	id: string | Expression<string>;
};

/** Add a comment to a task */
export type AsanaV1TaskProjectAddConfig = {
	resource: 'taskProject';
	operation: 'add';
	/**
	 * The ID of the task to add the project to
	 * @displayOptions.show { operation: ["add"], resource: ["taskProject"] }
	 */
	id: string | Expression<string>;
	/**
	 * The project where the task will be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["add"], resource: ["taskProject"] }
	 */
	project: string | Expression<string>;
	/**
	 * Other properties to set
	 * @displayOptions.show { resource: ["taskProject"], operation: ["add"] }
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Remove a comment from a task */
export type AsanaV1TaskProjectRemoveConfig = {
	resource: 'taskProject';
	operation: 'remove';
	/**
	 * The ID of the task to add the project to
	 * @displayOptions.show { operation: ["remove"], resource: ["taskProject"] }
	 */
	id: string | Expression<string>;
	/**
	 * The project where the task will be removed from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["remove"], resource: ["taskProject"] }
	 */
	project: string | Expression<string>;
};

/** Add a comment to a task */
export type AsanaV1TaskTagAddConfig = {
	resource: 'taskTag';
	operation: 'add';
	/**
	 * The ID of the task to add the tag to
	 * @displayOptions.show { operation: ["add"], resource: ["taskTag"] }
	 */
	id: string | Expression<string>;
	/**
	 * The tag that should be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["add"], resource: ["taskTag"] }
	 */
	tag: string | Expression<string>;
};

/** Remove a comment from a task */
export type AsanaV1TaskTagRemoveConfig = {
	resource: 'taskTag';
	operation: 'remove';
	/**
	 * The ID of the task to add the tag to
	 * @displayOptions.show { operation: ["remove"], resource: ["taskTag"] }
	 */
	id: string | Expression<string>;
	/**
	 * The tag that should be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["remove"], resource: ["taskTag"] }
	 */
	tag: string | Expression<string>;
};

/** Get a task */
export type AsanaV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * An identifier for the user to get data of. Can be one of an email address,the globally unique identifier for the user, or the keyword me to indicate the current user making the request.
	 * @displayOptions.show { operation: ["get"], resource: ["user"] }
	 */
	userId: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["getAll"], resource: ["user"] }
	 */
	workspace: string | Expression<string>;
};

export type AsanaV1Params =
	| AsanaV1ProjectCreateConfig
	| AsanaV1ProjectDeleteConfig
	| AsanaV1ProjectGetConfig
	| AsanaV1ProjectGetAllConfig
	| AsanaV1ProjectUpdateConfig
	| AsanaV1SubtaskCreateConfig
	| AsanaV1SubtaskGetAllConfig
	| AsanaV1TaskCreateConfig
	| AsanaV1TaskDeleteConfig
	| AsanaV1TaskGetConfig
	| AsanaV1TaskGetAllConfig
	| AsanaV1TaskMoveConfig
	| AsanaV1TaskSearchConfig
	| AsanaV1TaskUpdateConfig
	| AsanaV1TaskCommentAddConfig
	| AsanaV1TaskCommentRemoveConfig
	| AsanaV1TaskProjectAddConfig
	| AsanaV1TaskProjectRemoveConfig
	| AsanaV1TaskTagAddConfig
	| AsanaV1TaskTagRemoveConfig
	| AsanaV1UserGetConfig
	| AsanaV1UserGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AsanaV1Credentials {
	asanaApi: CredentialReference;
	asanaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AsanaV1Node = {
	type: 'n8n-nodes-base.asana';
	version: 1;
	config: NodeConfig<AsanaV1Params>;
	credentials?: AsanaV1Credentials;
};

export type AsanaNode = AsanaV1Node;
