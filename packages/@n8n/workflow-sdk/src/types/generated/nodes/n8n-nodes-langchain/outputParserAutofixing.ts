/**
 * Auto-fixing Output Parser Node Types
 *
 * Deprecated, use structured output parser
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/outputparserautofixing/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserAutofixingV1Params {
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcOutputParserAutofixingNode = {
	type: '@n8n/n8n-nodes-langchain.outputParserAutofixing';
	version: 1;
	config: NodeConfig<LcOutputParserAutofixingV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
