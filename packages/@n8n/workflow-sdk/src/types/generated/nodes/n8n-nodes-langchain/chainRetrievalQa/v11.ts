/**
 * Question and Answer Chain Node - Version 1.1
 * Answer questions about retrieved documents
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainRetrievalQaV11AutoConfig = {
	promptType: 'auto';
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV11GuardrailsConfig = {
	promptType: 'guardrails';
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV11DefineConfig = {
	promptType: 'define';
	query: string | Expression<string>;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcChainRetrievalQaV11Params =
	| LcChainRetrievalQaV11AutoConfig
	| LcChainRetrievalQaV11GuardrailsConfig
	| LcChainRetrievalQaV11DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainRetrievalQaV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.1;
}

export type LcChainRetrievalQaV11AutoNode = LcChainRetrievalQaV11NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV11AutoConfig>;
};

export type LcChainRetrievalQaV11GuardrailsNode = LcChainRetrievalQaV11NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV11GuardrailsConfig>;
};

export type LcChainRetrievalQaV11DefineNode = LcChainRetrievalQaV11NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV11DefineConfig>;
};

export type LcChainRetrievalQaV11Node =
	| LcChainRetrievalQaV11AutoNode
	| LcChainRetrievalQaV11GuardrailsNode
	| LcChainRetrievalQaV11DefineNode
	;