/**
 * Model Selector Node Types
 *
 * Use this node to select one of the connected models to this node based on workflow data
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/modelselector/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcModelSelectorV1Params {
	/**
	 * The number of data inputs you want to merge. The node waits for all connected inputs to be executed.
	 * @default 2
	 */
	numberInputs?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Expression<number>;
	/**
	 * Rules to map workflow data to specific models
	 * @default {}
	 */
	rules?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcModelSelectorNode = {
	type: '@n8n/n8n-nodes-langchain.modelSelector';
	version: 1;
	config: NodeConfig<LcModelSelectorV1Params>;
	credentials?: Record<string, never>;
};
