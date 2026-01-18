/**
 * CircleCI Node Types
 *
 * Consume CircleCI API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/circleci/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a pipeline */
export type CircleCiV1PipelineGetConfig = {
	resource: 'pipeline';
	operation: 'get';
	/**
	 * Source control system
	 */
	vcs?: 'bitbucket' | 'github' | Expression<string>;
	/**
	 * Project slug in the form org-name/repo-name
	 */
	projectSlug?: string | Expression<string>;
	/**
	 * The number of the pipeline
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
	 */
	vcs?: 'bitbucket' | 'github' | Expression<string>;
	/**
	 * Project slug in the form org-name/repo-name
	 */
	projectSlug?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	vcs?: 'bitbucket' | 'github' | Expression<string>;
	/**
	 * Project slug in the form org-name/repo-name
	 */
	projectSlug?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CircleCiV1Params =
	| CircleCiV1PipelineGetConfig
	| CircleCiV1PipelineGetAllConfig
	| CircleCiV1PipelineTriggerConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CircleCiV1Credentials {
	circleCiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type CircleCiV1Node = {
	type: 'n8n-nodes-base.circleCi';
	version: 1;
	config: NodeConfig<CircleCiV1Params>;
	credentials?: CircleCiV1Credentials;
};

export type CircleCiNode = CircleCiV1Node;
