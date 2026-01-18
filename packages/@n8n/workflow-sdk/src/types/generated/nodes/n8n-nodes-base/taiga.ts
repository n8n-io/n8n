/**
 * Taiga Node Types
 *
 * Consume Taiga API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/taiga/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an epic */
export type TaigaV1EpicCreateConfig = {
	resource: 'epic';
	operation: 'create';
	/**
	 * ID of the project to which the epic belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 */
	epicId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1EpicGetConfig = {
	resource: 'epic';
	operation: 'get';
	/**
	 * ID of the epic to retrieve
	 */
	epicId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1EpicGetAllConfig = {
	resource: 'epic';
	operation: 'getAll';
	/**
	 * ID of the project to which the epic belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	projectId?: string | Expression<string>;
	/**
	 * ID of the epic to update
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
	 */
	issueId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1IssueGetConfig = {
	resource: 'issue';
	operation: 'get';
	/**
	 * ID of the issue to retrieve
	 */
	issueId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1IssueGetAllConfig = {
	resource: 'issue';
	operation: 'getAll';
	/**
	 * ID of the project to which the issue belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	projectId?: string | Expression<string>;
	/**
	 * ID of the issue to update
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
	 */
	taskId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * ID of the task to retrieve
	 */
	taskId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * ID of the project to which the task belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	projectId?: string | Expression<string>;
	/**
	 * ID of the task to update
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
	 */
	userStoryId: string | Expression<string>;
};

/** Get an epic */
export type TaigaV1UserStoryGetConfig = {
	resource: 'userStory';
	operation: 'get';
	/**
	 * ID of the user story to retrieve
	 */
	userStoryId: string | Expression<string>;
};

/** Get many epics */
export type TaigaV1UserStoryGetAllConfig = {
	resource: 'userStory';
	operation: 'getAll';
	/**
	 * ID of the project to which the user story belongs. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	projectId?: string | Expression<string>;
	/**
	 * ID of the user story to update
	 */
	userStoryId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type TaigaV1Params =
	| TaigaV1EpicCreateConfig
	| TaigaV1EpicDeleteConfig
	| TaigaV1EpicGetConfig
	| TaigaV1EpicGetAllConfig
	| TaigaV1EpicUpdateConfig
	| TaigaV1IssueCreateConfig
	| TaigaV1IssueDeleteConfig
	| TaigaV1IssueGetConfig
	| TaigaV1IssueGetAllConfig
	| TaigaV1IssueUpdateConfig
	| TaigaV1TaskCreateConfig
	| TaigaV1TaskDeleteConfig
	| TaigaV1TaskGetConfig
	| TaigaV1TaskGetAllConfig
	| TaigaV1TaskUpdateConfig
	| TaigaV1UserStoryCreateConfig
	| TaigaV1UserStoryDeleteConfig
	| TaigaV1UserStoryGetConfig
	| TaigaV1UserStoryGetAllConfig
	| TaigaV1UserStoryUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TaigaV1Credentials {
	taigaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TaigaNode = {
	type: 'n8n-nodes-base.taiga';
	version: 1;
	config: NodeConfig<TaigaV1Params>;
	credentials?: TaigaV1Credentials;
};
