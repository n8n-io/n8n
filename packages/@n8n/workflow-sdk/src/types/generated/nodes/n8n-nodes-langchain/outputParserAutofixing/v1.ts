/**
 * Auto-fixing Output Parser Node - Version 1
 * Deprecated, use structured output parser
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserAutofixingV1Config {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcOutputParserAutofixingV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.outputParserAutofixing';
	version: 1;
	isTrigger: true;
}

export type LcOutputParserAutofixingV1Node = LcOutputParserAutofixingV1NodeBase & {
	config: NodeConfig<LcOutputParserAutofixingV1Config>;
};

export type LcOutputParserAutofixingV1Node = LcOutputParserAutofixingV1Node;