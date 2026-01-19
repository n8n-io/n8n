/**
 * Question and Answer Chain Node - Version 1.7
 * Answer questions about retrieved documents
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainRetrievalQaV17AutoConfig = {
	promptType: 'auto';
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV17GuardrailsConfig = {
	promptType: 'guardrails';
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV17DefineConfig = {
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

interface LcChainRetrievalQaV17NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.7;
}

export type LcChainRetrievalQaV17AutoNode = LcChainRetrievalQaV17NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV17AutoConfig>;
};

export type LcChainRetrievalQaV17GuardrailsNode = LcChainRetrievalQaV17NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV17GuardrailsConfig>;
};

export type LcChainRetrievalQaV17DefineNode = LcChainRetrievalQaV17NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV17DefineConfig>;
};

export type LcChainRetrievalQaV17Node =
	| LcChainRetrievalQaV17AutoNode
	| LcChainRetrievalQaV17GuardrailsNode
	| LcChainRetrievalQaV17DefineNode
	;