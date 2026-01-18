/**
 * Text Classifier Node - Version 1
 * Classify your text into distinct categories
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextClassifierV1Params {
/**
 * Use an expression to reference data in previous nodes or enter static text
 */
		inputText: string | Expression<string>;
	categories?: {
		categories?: Array<{
			/** Category to add
			 */
			category?: string | Expression<string>;
			/** Describe your category if it's not obvious
			 */
			description?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcTextClassifierV1Node = {
	type: '@n8n/n8n-nodes-langchain.textClassifier';
	version: 1;
	config: NodeConfig<LcTextClassifierV1Params>;
	credentials?: Record<string, never>;
};