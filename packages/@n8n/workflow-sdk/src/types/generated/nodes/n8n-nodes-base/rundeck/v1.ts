/**
 * Rundeck Node - Version 1
 * Manage Rundeck API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RundeckV1Params {
	resource?: 'job' | Expression<string>;
	operation?: 'execute' | 'getMetadata' | Expression<string>;
/**
 * The job ID to execute
 * @displayOptions.show { operation: ["execute"], resource: ["job"] }
 */
		jobid: string | Expression<string>;
	arguments?: {
		arguments?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Filter Rundeck nodes by name
 * @displayOptions.show { operation: ["execute"], resource: ["job"] }
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

interface RundeckV1NodeBase {
	type: 'n8n-nodes-base.rundeck';
	version: 1;
	credentials?: RundeckV1Credentials;
}

export type RundeckV1ParamsNode = RundeckV1NodeBase & {
	config: NodeConfig<RundeckV1Params>;
};

export type RundeckV1Node = RundeckV1ParamsNode;