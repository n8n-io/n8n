/**
 * Text Classifier Node - Version 1.1
 * Classify your text into distinct categories
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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
// Node Types
// ===========================================================================

interface LcTextClassifierV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.textClassifier';
	version: 1.1;
}

export type LcTextClassifierV11ParamsNode = LcTextClassifierV11NodeBase & {
	config: NodeConfig<LcTextClassifierV11Params>;
};

export type LcTextClassifierV11Node = LcTextClassifierV11ParamsNode;