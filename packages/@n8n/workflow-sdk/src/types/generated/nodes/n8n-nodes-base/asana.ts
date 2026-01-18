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
	 */
	name: string | Expression<string>;
	/**
	 * The workspace to create the project in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	workspace: string | Expression<string>;
	/**
	 * The team this project will be assigned to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	team?: string | Expression<string>;
	/**
	 * Other properties to set
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
	 */
	workspace: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Other properties to set
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
	 */
	workspace: string | Expression<string>;
	/**
	 * The ID of the project to update the data of
	 */
	id: string | Expression<string>;
	/**
	 * Other properties to set
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
	 */
	taskId: string | Expression<string>;
	/**
	 * The name of the subtask to create
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
	 */
	taskId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	workspace: string | Expression<string>;
	/**
	 * The name of the task to create
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
	 */
	id: string | Expression<string>;
};

/** Get a task */
export type AsanaV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * The ID of the task to get the data of
	 */
	id: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * Properties to search for
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
	 */
	id: string | Expression<string>;
	/**
	 * Project to show the sections of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * The Section to move the task to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	section: string | Expression<string>;
};

/** Search for tasks */
export type AsanaV1TaskSearchConfig = {
	resource: 'task';
	operation: 'search';
	/**
	 * The workspace in which the task is searched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	workspace: string | Expression<string>;
	/**
	 * Properties to search for
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
	 */
	id: string | Expression<string>;
	/**
	 * Whether body is HTML or simple text
	 * @default false
	 */
	isTextHtml?: boolean | Expression<boolean>;
	/**
	 * The plain text of the comment to add
	 */
	text: string | Expression<string>;
	/**
	 * Properties of the task comment
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
	 */
	id: string | Expression<string>;
};

/** Add a comment to a task */
export type AsanaV1TaskProjectAddConfig = {
	resource: 'taskProject';
	operation: 'add';
	/**
	 * The ID of the task to add the project to
	 */
	id: string | Expression<string>;
	/**
	 * The project where the task will be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	project: string | Expression<string>;
	/**
	 * Other properties to set
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
	 */
	id: string | Expression<string>;
	/**
	 * The project where the task will be removed from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	project: string | Expression<string>;
};

/** Add a comment to a task */
export type AsanaV1TaskTagAddConfig = {
	resource: 'taskTag';
	operation: 'add';
	/**
	 * The ID of the task to add the tag to
	 */
	id: string | Expression<string>;
	/**
	 * The tag that should be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tag: string | Expression<string>;
};

/** Remove a comment from a task */
export type AsanaV1TaskTagRemoveConfig = {
	resource: 'taskTag';
	operation: 'remove';
	/**
	 * The ID of the task to add the tag to
	 */
	id: string | Expression<string>;
	/**
	 * The tag that should be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tag: string | Expression<string>;
};

/** Get a task */
export type AsanaV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * An identifier for the user to get data of. Can be one of an email address,the globally unique identifier for the user, or the keyword me to indicate the current user making the request.
	 */
	userId: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
