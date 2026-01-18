/**
 * Rundeck Node Types
 *
 * Manage Rundeck API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/rundeck/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RundeckV1Params {
	resource?: 'job' | Expression<string>;
	operation?: 'execute' | 'getMetadata' | Expression<string>;
	/**
	 * The job ID to execute
	 */
	jobid: string | Expression<string>;
	arguments?: Record<string, unknown>;
	/**
	 * Filter Rundeck nodes by name
	 */
	filter?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface RundeckV1Credentials {
	rundeckApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type RundeckV1Node = {
	type: 'n8n-nodes-base.rundeck';
	version: 1;
	config: NodeConfig<RundeckV1Params>;
	credentials?: RundeckV1Credentials;
};

export type RundeckNode = RundeckV1Node;
