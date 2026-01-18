/**
 * Sentiment Analysis Node - Version 1.1
 * Analyze the sentiment of your text
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcSentimentAnalysisV11Params {
/**
 * Use an expression to reference data in previous nodes or enter static text
 */
		inputText: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcSentimentAnalysisV11Node = {
	type: '@n8n/n8n-nodes-langchain.sentimentAnalysis';
	version: 1 | 1.1;
	config: NodeConfig<LcSentimentAnalysisV11Params>;
	credentials?: Record<string, never>;
};