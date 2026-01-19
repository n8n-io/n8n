/**
 * Flow Node - Version 1
 * Consume Flow API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones. */
export type FlowV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Create resources under the given workspace
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		workspaceId: string | Expression<string>;
/**
 * The title of the task
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones. */
export type FlowV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * Create resources under the given workspace
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		workspaceId: string | Expression<string>;
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones. */
export type FlowV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones. */
export type FlowV1TaskGetAllConfig = {
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
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface FlowV1Credentials {
	flowApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FlowV1NodeBase {
	type: 'n8n-nodes-base.flow';
	version: 1;
	credentials?: FlowV1Credentials;
}

export type FlowV1TaskCreateNode = FlowV1NodeBase & {
	config: NodeConfig<FlowV1TaskCreateConfig>;
};

export type FlowV1TaskUpdateNode = FlowV1NodeBase & {
	config: NodeConfig<FlowV1TaskUpdateConfig>;
};

export type FlowV1TaskGetNode = FlowV1NodeBase & {
	config: NodeConfig<FlowV1TaskGetConfig>;
};

export type FlowV1TaskGetAllNode = FlowV1NodeBase & {
	config: NodeConfig<FlowV1TaskGetAllConfig>;
};

export type FlowV1Node =
	| FlowV1TaskCreateNode
	| FlowV1TaskUpdateNode
	| FlowV1TaskGetNode
	| FlowV1TaskGetAllNode
	;