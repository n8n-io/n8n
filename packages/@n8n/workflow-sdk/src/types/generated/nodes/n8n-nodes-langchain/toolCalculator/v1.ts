/**
 * Calculator Node - Version 1
 * Make it easier for AI agents to perform arithmetic
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolCalculatorV1Config {
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

export type LcToolCalculatorV1Node = LcToolCalculatorV1NodeBase & {
	config: NodeConfig<LcToolCalculatorV1Config>;
};

export type LcToolCalculatorV1Node = LcToolCalculatorV1Node;