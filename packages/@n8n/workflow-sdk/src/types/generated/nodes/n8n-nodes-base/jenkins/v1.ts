/**
 * Jenkins Node - Version 1
 * Consume Jenkins API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** List Builds */
export type JenkinsV1BuildGetAllConfig = {
	resource: 'build';
	operation: 'getAll';
/**
 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["build"], operation: ["getAll"] }
 */
		job: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["build"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["build"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Cancel quiet down state */
export type JenkinsV1InstanceCancelQuietDownConfig = {
	resource: 'instance';
	operation: 'cancelQuietDown';
};

/** Put Jenkins in quiet mode, no builds can be started, Jenkins is ready for shutdown */
export type JenkinsV1InstanceQuietDownConfig = {
	resource: 'instance';
	operation: 'quietDown';
/**
 * Freeform reason for quiet down mode
 * @displayOptions.show { resource: ["instance"], operation: ["quietDown"] }
 */
		reason?: string | Expression<string>;
};

/** Restart Jenkins immediately on environments where it is possible */
export type JenkinsV1InstanceRestartConfig = {
	resource: 'instance';
	operation: 'restart';
};

/** Restart Jenkins once no jobs are running on environments where it is possible */
export type JenkinsV1InstanceSafeRestartConfig = {
	resource: 'instance';
	operation: 'safeRestart';
};

/** Shutdown once no jobs are running */
export type JenkinsV1InstanceSafeExitConfig = {
	resource: 'instance';
	operation: 'safeExit';
};

/** Shutdown Jenkins immediately */
export type JenkinsV1InstanceExitConfig = {
	resource: 'instance';
	operation: 'exit';
};

/** Copy a specific job */
export type JenkinsV1JobCopyConfig = {
	resource: 'job';
	operation: 'copy';
/**
 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["job"], operation: ["trigger", "triggerParams", "copy"] }
 */
		job: string | Expression<string>;
/**
 * Name of the new Jenkins job
 * @displayOptions.show { resource: ["job"], operation: ["copy", "create"] }
 */
		newJob: string | Expression<string>;
};

/** Create a new job */
export type JenkinsV1JobCreateConfig = {
	resource: 'job';
	operation: 'create';
/**
 * Name of the new Jenkins job
 * @displayOptions.show { resource: ["job"], operation: ["copy", "create"] }
 */
		newJob: string | Expression<string>;
/**
 * XML of Jenkins config
 * @displayOptions.show { resource: ["job"], operation: ["create"] }
 */
		xml: string | Expression<string>;
};

/** Trigger a specific job */
export type JenkinsV1JobTriggerConfig = {
	resource: 'job';
	operation: 'trigger';
/**
 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["job"], operation: ["trigger", "triggerParams", "copy"] }
 */
		job: string | Expression<string>;
};

/** Trigger a specific job */
export type JenkinsV1JobTriggerParamsConfig = {
	resource: 'job';
	operation: 'triggerParams';
/**
 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["job"], operation: ["trigger", "triggerParams", "copy"] }
 */
		job: string | Expression<string>;
/**
 * Parameters for Jenkins job
 * @displayOptions.show { resource: ["job"], operation: ["triggerParams"] }
 * @default {}
 */
		param: {
		params?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};


// ===========================================================================
// Output Types
// ===========================================================================

export type JenkinsV1JobTriggerOutput = {
	success?: boolean;
};

export type JenkinsV1JobTriggerParamsOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface JenkinsV1Credentials {
	jenkinsApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface JenkinsV1NodeBase {
	type: 'n8n-nodes-base.jenkins';
	version: 1;
	credentials?: JenkinsV1Credentials;
}

export type JenkinsV1BuildGetAllNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1BuildGetAllConfig>;
};

export type JenkinsV1InstanceCancelQuietDownNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1InstanceCancelQuietDownConfig>;
};

export type JenkinsV1InstanceQuietDownNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1InstanceQuietDownConfig>;
};

export type JenkinsV1InstanceRestartNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1InstanceRestartConfig>;
};

export type JenkinsV1InstanceSafeRestartNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1InstanceSafeRestartConfig>;
};

export type JenkinsV1InstanceSafeExitNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1InstanceSafeExitConfig>;
};

export type JenkinsV1InstanceExitNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1InstanceExitConfig>;
};

export type JenkinsV1JobCopyNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1JobCopyConfig>;
};

export type JenkinsV1JobCreateNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1JobCreateConfig>;
};

export type JenkinsV1JobTriggerNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1JobTriggerConfig>;
	output?: JenkinsV1JobTriggerOutput;
};

export type JenkinsV1JobTriggerParamsNode = JenkinsV1NodeBase & {
	config: NodeConfig<JenkinsV1JobTriggerParamsConfig>;
	output?: JenkinsV1JobTriggerParamsOutput;
};

export type JenkinsV1Node =
	| JenkinsV1BuildGetAllNode
	| JenkinsV1InstanceCancelQuietDownNode
	| JenkinsV1InstanceQuietDownNode
	| JenkinsV1InstanceRestartNode
	| JenkinsV1InstanceSafeRestartNode
	| JenkinsV1InstanceSafeExitNode
	| JenkinsV1InstanceExitNode
	| JenkinsV1JobCopyNode
	| JenkinsV1JobCreateNode
	| JenkinsV1JobTriggerNode
	| JenkinsV1JobTriggerParamsNode
	;