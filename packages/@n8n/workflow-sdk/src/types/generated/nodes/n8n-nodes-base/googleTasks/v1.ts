/**
 * Google Tasks Node - Version 1
 * Consume Google Tasks API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add a task to tasklist */
export type GoogleTasksV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		task: string | Expression<string>;
/**
 * Title of the task
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		title?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a task */
export type GoogleTasksV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["delete"], resource: ["task"] }
 */
		task: string | Expression<string>;
	taskId: string | Expression<string>;
};

/** Retrieve a task */
export type GoogleTasksV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["get"], resource: ["task"] }
 */
		task: string | Expression<string>;
	taskId: string | Expression<string>;
};

/** Retrieve many tasks from a tasklist */
export type GoogleTasksV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
 */
		task: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["task"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a task */
export type GoogleTasksV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["task"] }
 */
		task: string | Expression<string>;
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type GoogleTasksV1Params =
	| GoogleTasksV1TaskCreateConfig
	| GoogleTasksV1TaskDeleteConfig
	| GoogleTasksV1TaskGetConfig
	| GoogleTasksV1TaskGetAllConfig
	| GoogleTasksV1TaskUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleTasksV1Credentials {
	googleTasksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleTasksV1Node = {
	type: 'n8n-nodes-base.googleTasks';
	version: 1;
	config: NodeConfig<GoogleTasksV1Params>;
	credentials?: GoogleTasksV1Credentials;
};