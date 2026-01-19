/**
 * Phantombuster Node - Version 1
 * Consume Phantombuster API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete an agent by ID */
export type PhantombusterV1AgentDeleteConfig = {
	resource: 'agent';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["delete"], resource: ["agent"] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["agent"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["agent"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["getOutput"], resource: ["agent"] }
 */
		agentId: string | Expression<string>;
/**
 * By default the outpout is presented as string. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { operation: ["getOutput"], resource: ["agent"] }
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
 * @displayOptions.show { operation: ["launch"], resource: ["agent"] }
 */
		agentId: string | Expression<string>;
/**
 * By default the launch just include the container ID. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { operation: ["launch"], resource: ["agent"] }
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
	| PhantombusterV1AgentLaunchConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type PhantombusterV1AgentGetOutput = {
	argument?: string;
	branch?: string;
	code?: null;
	environment?: string;
	fileMgmt?: string;
	id?: string;
	lastEndType?: string;
	launchType?: string;
	maxParallelism?: number;
	name?: string;
	nbLaunches?: number;
	notifications?: {
		mailAutomaticExitError?: boolean;
		mailAutomaticExitSuccess?: boolean;
		mailAutomaticLaunchError?: boolean;
		mailAutomaticTimeError?: boolean;
		mailManualExitError?: boolean;
		mailManualExitSuccess?: boolean;
		mailManualLaunchError?: boolean;
		mailManualTimeError?: boolean;
	};
	orgS3Folder?: string;
	s3Folder?: string;
	script?: string;
	scriptId?: string;
	scriptOrgName?: string;
	updatedAt?: number;
	wasSetupValidWhenSubmittedByTheFrontend?: boolean;
};

export type PhantombusterV1AgentGetOutputOutput = {
	profileUrl?: string;
	timestamp?: string;
};

export type PhantombusterV1AgentLaunchOutput = {
	createdAt?: number;
	id?: string;
	launchedAt?: number;
	launchType?: string;
	retryNumber?: number;
	status?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface PhantombusterV1Credentials {
	phantombusterApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PhantombusterV1NodeBase {
	type: 'n8n-nodes-base.phantombuster';
	version: 1;
	credentials?: PhantombusterV1Credentials;
}

export type PhantombusterV1AgentDeleteNode = PhantombusterV1NodeBase & {
	config: NodeConfig<PhantombusterV1AgentDeleteConfig>;
};

export type PhantombusterV1AgentGetNode = PhantombusterV1NodeBase & {
	config: NodeConfig<PhantombusterV1AgentGetConfig>;
	output?: PhantombusterV1AgentGetOutput;
};

export type PhantombusterV1AgentGetAllNode = PhantombusterV1NodeBase & {
	config: NodeConfig<PhantombusterV1AgentGetAllConfig>;
};

export type PhantombusterV1AgentGetOutputNode = PhantombusterV1NodeBase & {
	config: NodeConfig<PhantombusterV1AgentGetOutputConfig>;
	output?: PhantombusterV1AgentGetOutputOutput;
};

export type PhantombusterV1AgentLaunchNode = PhantombusterV1NodeBase & {
	config: NodeConfig<PhantombusterV1AgentLaunchConfig>;
	output?: PhantombusterV1AgentLaunchOutput;
};

export type PhantombusterV1Node =
	| PhantombusterV1AgentDeleteNode
	| PhantombusterV1AgentGetNode
	| PhantombusterV1AgentGetAllNode
	| PhantombusterV1AgentGetOutputNode
	| PhantombusterV1AgentLaunchNode
	;