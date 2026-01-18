/**
 * Jenkins Node - Version 1
 * Consume Jenkins API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type JenkinsV1Params =
	| JenkinsV1BuildGetAllConfig
	| JenkinsV1InstanceCancelQuietDownConfig
	| JenkinsV1InstanceQuietDownConfig
	| JenkinsV1InstanceRestartConfig
	| JenkinsV1InstanceSafeRestartConfig
	| JenkinsV1InstanceSafeExitConfig
	| JenkinsV1InstanceExitConfig
	| JenkinsV1JobCopyConfig
	| JenkinsV1JobCreateConfig
	| JenkinsV1JobTriggerConfig
	| JenkinsV1JobTriggerParamsConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface JenkinsV1Credentials {
	jenkinsApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type JenkinsV1Node = {
	type: 'n8n-nodes-base.jenkins';
	version: 1;
	config: NodeConfig<JenkinsV1Params>;
	credentials?: JenkinsV1Credentials;
};