/**
 * Calculator Node - Version 1
 * Make it easier for AI agents to perform arithmetic
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolCalculatorV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcToolCalculatorV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolCalculator';
	version: 1;
	isTrigger: true;
}

export type LcToolCalculatorV1ParamsNode = LcToolCalculatorV1NodeBase & {
	config: NodeConfig<LcToolCalculatorV1Params>;
};

export type LcToolCalculatorV1Node = LcToolCalculatorV1ParamsNode;