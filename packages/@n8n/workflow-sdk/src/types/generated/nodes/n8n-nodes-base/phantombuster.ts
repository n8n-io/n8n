/**
 * Phantombuster Node Types
 *
 * Consume Phantombuster API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/phantombuster/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete an agent by ID */
export type PhantombusterV1AgentDeleteConfig = {
	resource: 'agent';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	agentId: string | Expression<string>;
};

/** Get an agent by ID */
export type PhantombusterV1AgentGetConfig = {
	resource: 'agent';
	operation: 'get';
	agentId: string | Expression<string>;
};

/** Get many agents of the current user's organization */
export type PhantombusterV1AgentGetAllConfig = {
	resource: 'agent';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 25
	 */
	limit?: number | Expression<number>;
};

/** Get the output of the most recent container of an agent */
export type PhantombusterV1AgentGetOutputConfig = {
	resource: 'agent';
	operation: 'getOutput';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	agentId: string | Expression<string>;
	/**
	 * By default the outpout is presented as string. If this option gets activated, it will resolve the data automatically.
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Add an agent to the launch queue */
export type PhantombusterV1AgentLaunchConfig = {
	resource: 'agent';
	operation: 'launch';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	agentId: string | Expression<string>;
	/**
	 * By default the launch just include the container ID. If this option gets activated, it will resolve the data automatically.
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type PhantombusterV1Params =
	| PhantombusterV1AgentDeleteConfig
	| PhantombusterV1AgentGetConfig
	| PhantombusterV1AgentGetAllConfig
	| PhantombusterV1AgentGetOutputConfig
	| PhantombusterV1AgentLaunchConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PhantombusterV1Credentials {
	phantombusterApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PhantombusterV1Node = {
	type: 'n8n-nodes-base.phantombuster';
	version: 1;
	config: NodeConfig<PhantombusterV1Params>;
	credentials?: PhantombusterV1Credentials;
};

export type PhantombusterNode = PhantombusterV1Node;
