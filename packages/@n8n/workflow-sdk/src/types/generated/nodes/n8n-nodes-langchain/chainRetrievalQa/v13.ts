/**
 * Question and Answer Chain Node - Version 1.3
 * Answer questions about retrieved documents
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainRetrievalQaV13AutoConfig = {
	promptType: 'auto';
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV13GuardrailsConfig = {
	promptType: 'guardrails';
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV13DefineConfig = {
	promptType: 'define';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainRetrievalQaV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.3;
}

export type LcChainRetrievalQaV13AutoNode = LcChainRetrievalQaV13NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV13AutoConfig>;
};

export type LcChainRetrievalQaV13GuardrailsNode = LcChainRetrievalQaV13NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV13GuardrailsConfig>;
};

export type LcChainRetrievalQaV13DefineNode = LcChainRetrievalQaV13NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV13DefineConfig>;
};

export type LcChainRetrievalQaV13Node =
	| LcChainRetrievalQaV13AutoNode
	| LcChainRetrievalQaV13GuardrailsNode
	| LcChainRetrievalQaV13DefineNode
	;