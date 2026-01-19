/**
 * Sentiment Analysis Node - Version 1.1
 * Analyze the sentiment of your text
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcSentimentAnalysisV11Config {
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
// Node Types
// ===========================================================================

interface LcSentimentAnalysisV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.sentimentAnalysis';
	version: 1.1;
}

export type LcSentimentAnalysisV11Node = LcSentimentAnalysisV11NodeBase & {
	config: NodeConfig<LcSentimentAnalysisV11Config>;
};

export type LcSentimentAnalysisV11Node = LcSentimentAnalysisV11Node;