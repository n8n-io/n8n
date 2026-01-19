/**
 * Google Tasks Node - Version 1
 * Consume Google Tasks API
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleTasksV1Credentials {
	googleTasksOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleTasksV1NodeBase {
	type: 'n8n-nodes-base.googleTasks';
	version: 1;
	credentials?: GoogleTasksV1Credentials;
}

export type GoogleTasksV1TaskCreateNode = GoogleTasksV1NodeBase & {
	config: NodeConfig<GoogleTasksV1TaskCreateConfig>;
};

export type GoogleTasksV1TaskDeleteNode = GoogleTasksV1NodeBase & {
	config: NodeConfig<GoogleTasksV1TaskDeleteConfig>;
};

export type GoogleTasksV1TaskGetNode = GoogleTasksV1NodeBase & {
	config: NodeConfig<GoogleTasksV1TaskGetConfig>;
};

export type GoogleTasksV1TaskGetAllNode = GoogleTasksV1NodeBase & {
	config: NodeConfig<GoogleTasksV1TaskGetAllConfig>;
};

export type GoogleTasksV1TaskUpdateNode = GoogleTasksV1NodeBase & {
	config: NodeConfig<GoogleTasksV1TaskUpdateConfig>;
};

export type GoogleTasksV1Node =
	| GoogleTasksV1TaskCreateNode
	| GoogleTasksV1TaskDeleteNode
	| GoogleTasksV1TaskGetNode
	| GoogleTasksV1TaskGetAllNode
	| GoogleTasksV1TaskUpdateNode
	;