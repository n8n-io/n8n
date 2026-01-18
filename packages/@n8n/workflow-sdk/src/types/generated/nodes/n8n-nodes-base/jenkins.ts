/**
 * Jenkins Node Types
 *
 * Consume Jenkins API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/jenkins/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** List Builds */
export type JenkinsV1BuildGetAllConfig = {
	resource: 'build';
	operation: 'getAll';
	/**
	 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	job: string | Expression<string>;
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
	 */
	job: string | Expression<string>;
	/**
	 * Name of the new Jenkins job
	 */
	newJob: string | Expression<string>;
};

/** Create a new job */
export type JenkinsV1JobCreateConfig = {
	resource: 'job';
	operation: 'create';
	/**
	 * Name of the new Jenkins job
	 */
	newJob: string | Expression<string>;
	/**
	 * XML of Jenkins config
	 */
	xml: string | Expression<string>;
};

/** Trigger a specific job */
export type JenkinsV1JobTriggerConfig = {
	resource: 'job';
	operation: 'trigger';
	/**
	 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	job: string | Expression<string>;
};

/** Trigger a specific job */
export type JenkinsV1JobTriggerParamsConfig = {
	resource: 'job';
	operation: 'triggerParams';
	/**
	 * Name of the job. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	job: string | Expression<string>;
	/**
	 * Parameters for Jenkins job
	 * @default {}
	 */
	param: Record<string, unknown>;
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
	| JenkinsV1JobTriggerParamsConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface JenkinsV1Credentials {
	jenkinsApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type JenkinsV1Node = {
	type: 'n8n-nodes-base.jenkins';
	version: 1;
	config: NodeConfig<JenkinsV1Params>;
	credentials?: JenkinsV1Credentials;
};

export type JenkinsNode = JenkinsV1Node;
