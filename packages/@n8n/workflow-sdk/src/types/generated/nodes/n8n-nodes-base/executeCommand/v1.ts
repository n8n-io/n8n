/**
 * Execute Command Node - Version 1
 * Executes a command on the host
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteCommandV1Config {
/**
 * Whether to execute only once instead of once for each entry
 * @default true
 */
		executeOnce?: boolean | Expression<boolean>;
/**
 * The command to execute
 */
		command: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ExecuteCommandV1NodeBase {
	type: 'n8n-nodes-base.executeCommand';
	version: 1;
}

export type ExecuteCommandV1Node = ExecuteCommandV1NodeBase & {
	config: NodeConfig<ExecuteCommandV1Config>;
};

export type ExecuteCommandV1Node = ExecuteCommandV1Node;