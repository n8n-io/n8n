/**
 * CircleCI Node - Version 1
 * Consume CircleCI API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a pipeline */
export type CircleCiV1PipelineGetConfig = {
	resource: 'pipeline';
	operation: 'get';
/**
 * Source control system
 * @displayOptions.show { operation: ["get", "getAll", "trigger"], resource: ["pipeline"] }
 */
		vcs?: 'bitbucket' | 'github' | Expression<string>;
/**
 * Project slug in the form org-name/repo-name
 * @displayOptions.show { operation: ["get", "getAll", "trigger"], resource: ["pipeline"] }
 */
		projectSlug?: string | Expression<string>;
/**
 * The number of the pipeline
 * @displayOptions.show { operation: ["get"], resource: ["pipeline"] }
 * @default 1
 */
		pipelineNumber?: number | Expression<number>;
};

/** Get many pipelines */
export type CircleCiV1PipelineGetAllConfig = {
	resource: 'pipeline';
	operation: 'getAll';
/**
 * Source control system
 * @displayOptions.show { operation: ["get", "getAll", "trigger"], resource: ["pipeline"] }
 */
		vcs?: 'bitbucket' | 'github' | Expression<string>;
/**
 * Project slug in the form org-name/repo-name
 * @displayOptions.show { operation: ["get", "getAll", "trigger"], resource: ["pipeline"] }
 */
		projectSlug?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["pipeline"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["pipeline"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Trigger a pipeline */
export type CircleCiV1PipelineTriggerConfig = {
	resource: 'pipeline';
	operation: 'trigger';
/**
 * Source control system
 * @displayOptions.show { operation: ["get", "getAll", "trigger"], resource: ["pipeline"] }
 */
		vcs?: 'bitbucket' | 'github' | Expression<string>;
/**
 * Project slug in the form org-name/repo-name
 * @displayOptions.show { operation: ["get", "getAll", "trigger"], resource: ["pipeline"] }
 */
		projectSlug?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface CircleCiV1Credentials {
	circleCiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CircleCiV1NodeBase {
	type: 'n8n-nodes-base.circleCi';
	version: 1;
	credentials?: CircleCiV1Credentials;
}

export type CircleCiV1PipelineGetNode = CircleCiV1NodeBase & {
	config: NodeConfig<CircleCiV1PipelineGetConfig>;
};

export type CircleCiV1PipelineGetAllNode = CircleCiV1NodeBase & {
	config: NodeConfig<CircleCiV1PipelineGetAllConfig>;
};

export type CircleCiV1PipelineTriggerNode = CircleCiV1NodeBase & {
	config: NodeConfig<CircleCiV1PipelineTriggerConfig>;
};

export type CircleCiV1Node =
	| CircleCiV1PipelineGetNode
	| CircleCiV1PipelineGetAllNode
	| CircleCiV1PipelineTriggerNode
	;