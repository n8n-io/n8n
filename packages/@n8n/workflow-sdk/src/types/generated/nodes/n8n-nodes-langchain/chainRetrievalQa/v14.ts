/**
 * Question and Answer Chain Node - Version 1.4
 * Answer questions about retrieved documents
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainRetrievalQaV14AutoConfig = {
	promptType: 'auto';
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV14GuardrailsConfig = {
	promptType: 'guardrails';
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV14DefineConfig = {
	promptType: 'define';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcChainRetrievalQaV14Params =
	| LcChainRetrievalQaV14AutoConfig
	| LcChainRetrievalQaV14GuardrailsConfig
	| LcChainRetrievalQaV14DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainRetrievalQaV14NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.4;
}

export type LcChainRetrievalQaV14AutoNode = LcChainRetrievalQaV14NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV14AutoConfig>;
};

export type LcChainRetrievalQaV14GuardrailsNode = LcChainRetrievalQaV14NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV14GuardrailsConfig>;
};

export type LcChainRetrievalQaV14DefineNode = LcChainRetrievalQaV14NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV14DefineConfig>;
};

export type LcChainRetrievalQaV14Node =
	| LcChainRetrievalQaV14AutoNode
	| LcChainRetrievalQaV14GuardrailsNode
	| LcChainRetrievalQaV14DefineNode
	;