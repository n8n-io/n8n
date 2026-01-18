/**
 * AI Transform Node Types
 *
 * Modify data based on instructions written in plain english
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/aitransform/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AiTransformV1Params {
	/**
	 * Provide instructions on how you want to transform the data, then click 'Generate code'. Use dot notation to refer to nested fields (e.g. address.street).
	 */
	instructions?: unknown;
	codeGeneratedForPrompt?: unknown;
	jsCode?: string | Expression<string>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AiTransformNode = {
	type: 'n8n-nodes-base.aiTransform';
	version: 1;
	config: NodeConfig<AiTransformV1Params>;
	credentials?: Record<string, never>;
};
