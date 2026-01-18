/**
 * Execute Command Node Types
 *
 * Executes a command on the host
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/executecommand/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteCommandV1Params {
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
// Node Type
// ===========================================================================

export type ExecuteCommandNode = {
	type: 'n8n-nodes-base.executeCommand';
	version: 1;
	config: NodeConfig<ExecuteCommandV1Params>;
	credentials?: Record<string, never>;
};
