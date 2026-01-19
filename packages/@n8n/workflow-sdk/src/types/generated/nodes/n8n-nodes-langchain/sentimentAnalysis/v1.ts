/**
 * Sentiment Analysis Node - Version 1
 * Analyze the sentiment of your text
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcSentimentAnalysisV1Config {
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

interface LcSentimentAnalysisV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.sentimentAnalysis';
	version: 1;
}

export type LcSentimentAnalysisV1Node = LcSentimentAnalysisV1NodeBase & {
	config: NodeConfig<LcSentimentAnalysisV1Config>;
};

export type LcSentimentAnalysisV1Node = LcSentimentAnalysisV1Node;