/**
 * TravisCI Node Types
 *
 * Consume TravisCI API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/travisci/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Cancel a build */
export type TravisCiV1BuildCancelConfig = {
	resource: 'build';
	operation: 'cancel';
	/**
	 * Value uniquely identifying the build
	 */
	buildId?: string | Expression<string>;
};

/** Get a build */
export type TravisCiV1BuildGetConfig = {
	resource: 'build';
	operation: 'get';
	/**
	 * Value uniquely identifying the build
	 */
	buildId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many builds */
export type TravisCiV1BuildGetAllConfig = {
	resource: 'build';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Restart a build */
export type TravisCiV1BuildRestartConfig = {
	resource: 'build';
	operation: 'restart';
	/**
	 * Value uniquely identifying the build
	 */
	buildId?: string | Expression<string>;
};

/** Trigger a build */
export type TravisCiV1BuildTriggerConfig = {
	resource: 'build';
	operation: 'trigger';
	/**
	 * Same as {ownerName}/{repositoryName}
	 */
	slug?: string | Expression<string>;
	/**
	 * Branch requested to be built
	 */
	branch?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type TravisCiV1Params =
	| TravisCiV1BuildCancelConfig
	| TravisCiV1BuildGetConfig
	| TravisCiV1BuildGetAllConfig
	| TravisCiV1BuildRestartConfig
	| TravisCiV1BuildTriggerConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TravisCiV1Credentials {
	travisCiApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TravisCiNode = {
	type: 'n8n-nodes-base.travisCi';
	version: 1;
	config: NodeConfig<TravisCiV1Params>;
	credentials?: TravisCiV1Credentials;
};
