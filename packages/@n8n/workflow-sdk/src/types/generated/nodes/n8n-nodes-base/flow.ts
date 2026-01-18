/**
 * Flow Node Types
 *
 * Consume Flow API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/flow/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones. */
export type FlowV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * Create resources under the given workspace
	 */
	workspaceId: string | Expression<string>;
	/**
	 * The title of the task
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

export type FlowV1Params =
	| FlowV1TaskCreateConfig
	| FlowV1TaskUpdateConfig
	| FlowV1TaskGetConfig
	| FlowV1TaskGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface FlowV1Credentials {
	flowApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FlowNode = {
	type: 'n8n-nodes-base.flow';
	version: 1;
	config: NodeConfig<FlowV1Params>;
	credentials?: FlowV1Credentials;
};
