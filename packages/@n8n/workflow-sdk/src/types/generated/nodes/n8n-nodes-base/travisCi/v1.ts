/**
 * TravisCI Node - Version 1
 * Consume TravisCI API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Cancel a build */
export type TravisCiV1BuildCancelConfig = {
	resource: 'build';
	operation: 'cancel';
/**
 * Value uniquely identifying the build
 * @displayOptions.show { operation: ["cancel"], resource: ["build"] }
 */
		buildId?: string | Expression<string>;
};

/** Get a build */
export type TravisCiV1BuildGetConfig = {
	resource: 'build';
	operation: 'get';
/**
 * Value uniquely identifying the build
 * @displayOptions.show { operation: ["get"], resource: ["build"] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["build"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["build"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["restart"], resource: ["build"] }
 */
		buildId?: string | Expression<string>;
};

/** Trigger a build */
export type TravisCiV1BuildTriggerConfig = {
	resource: 'build';
	operation: 'trigger';
/**
 * Same as {ownerName}/{repositoryName}
 * @displayOptions.show { operation: ["trigger"], resource: ["build"] }
 */
		slug?: string | Expression<string>;
/**
 * Branch requested to be built
 * @displayOptions.show { operation: ["trigger"], resource: ["build"] }
 */
		branch?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type TravisCiV1Params =
	| TravisCiV1BuildCancelConfig
	| TravisCiV1BuildGetConfig
	| TravisCiV1BuildGetAllConfig
	| TravisCiV1BuildRestartConfig
	| TravisCiV1BuildTriggerConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TravisCiV1Credentials {
	travisCiApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TravisCiV1NodeBase {
	type: 'n8n-nodes-base.travisCi';
	version: 1;
	credentials?: TravisCiV1Credentials;
}

export type TravisCiV1BuildCancelNode = TravisCiV1NodeBase & {
	config: NodeConfig<TravisCiV1BuildCancelConfig>;
};

export type TravisCiV1BuildGetNode = TravisCiV1NodeBase & {
	config: NodeConfig<TravisCiV1BuildGetConfig>;
};

export type TravisCiV1BuildGetAllNode = TravisCiV1NodeBase & {
	config: NodeConfig<TravisCiV1BuildGetAllConfig>;
};

export type TravisCiV1BuildRestartNode = TravisCiV1NodeBase & {
	config: NodeConfig<TravisCiV1BuildRestartConfig>;
};

export type TravisCiV1BuildTriggerNode = TravisCiV1NodeBase & {
	config: NodeConfig<TravisCiV1BuildTriggerConfig>;
};

export type TravisCiV1Node =
	| TravisCiV1BuildCancelNode
	| TravisCiV1BuildGetNode
	| TravisCiV1BuildGetAllNode
	| TravisCiV1BuildRestartNode
	| TravisCiV1BuildTriggerNode
	;