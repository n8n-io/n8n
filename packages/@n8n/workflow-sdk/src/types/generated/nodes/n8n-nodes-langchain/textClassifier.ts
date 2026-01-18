/**
 * Text Classifier Node Types
 *
 * Classify your text into distinct categories
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/textclassifier/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextClassifierV11Params {
	/**
	 * Use an expression to reference data in previous nodes or enter static text
	 */
	inputText: string | Expression<string>;
	categories?: {
		categories?: Array<{
			category?: string | Expression<string>;
			description?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcTextClassifierV11Node = {
	type: '@n8n/n8n-nodes-langchain.textClassifier';
	version: 1 | 1.1;
	config: NodeConfig<LcTextClassifierV11Params>;
	credentials?: Record<string, never>;
};

export type LcTextClassifierNode = LcTextClassifierV11Node;
