/**
 * LangChain Code Node Types
 *
 * LangChain Code Node
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/code/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcCodeV1Params {
	code?: Record<string, unknown>;
	/**
	 * The input to add
	 * @default {}
	 */
	inputs?: Record<string, unknown>;
	/**
	 * The output to add
	 * @default {}
	 */
	outputs?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcCodeNode = {
	type: '@n8n/n8n-nodes-langchain.code';
	version: 1;
	config: NodeConfig<LcCodeV1Params>;
	credentials?: Record<string, never>;
};
