/**
 * Stackby Node - Version 1
 * Read, write, and delete data in Stackby
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StackbyV1Params {
	operation?: 'append' | 'delete' | 'list' | 'read' | Expression<string>;
/**
 * The ID of the stack to access
 */
		stackId: string | Expression<string>;
/**
 * Enter Table Name
 */
		table: string | Expression<string>;
/**
 * ID of the record to return
 * @displayOptions.show { operation: ["read", "delete"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["list"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["list"], returnAll: [false] }
 * @default 1000
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
/**
 * Comma-separated list of the properties which should used as columns for the new rows
 * @displayOptions.show { operation: ["append"] }
 */
		columns: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface StackbyV1Credentials {
	stackbyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface StackbyV1NodeBase {
	type: 'n8n-nodes-base.stackby';
	version: 1;
	credentials?: StackbyV1Credentials;
}

export type StackbyV1ParamsNode = StackbyV1NodeBase & {
	config: NodeConfig<StackbyV1Params>;
};

export type StackbyV1Node = StackbyV1ParamsNode;