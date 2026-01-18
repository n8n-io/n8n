/**
 * Auto-fixing Output Parser Node - Version 1
 * Deprecated, use structured output parser
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserAutofixingV1Params {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcOutputParserAutofixingV1Node = {
	type: '@n8n/n8n-nodes-langchain.outputParserAutofixing';
	version: 1;
	config: NodeConfig<LcOutputParserAutofixingV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};