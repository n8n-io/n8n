/**
 * Calculator Node Types
 *
 * Make it easier for AI agents to perform arithmetic
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolcalculator/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolCalculatorV1Params {}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcToolCalculatorNode = {
	type: '@n8n/n8n-nodes-langchain.toolCalculator';
	version: 1;
	config: NodeConfig<LcToolCalculatorV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
