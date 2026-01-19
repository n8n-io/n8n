/**
 * Question and Answer Chain Node - Version 1
 * Answer questions about retrieved documents
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainRetrievalQaV1AutoConfig = {
	promptType: 'auto';
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV1GuardrailsConfig = {
	promptType: 'guardrails';
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV1DefineConfig = {
	promptType: 'define';
	query: string | Expression<string>;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcChainRetrievalQaV1Params =
	| LcChainRetrievalQaV1AutoConfig
	| LcChainRetrievalQaV1GuardrailsConfig
	| LcChainRetrievalQaV1DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainRetrievalQaV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1;
}

export type LcChainRetrievalQaV1AutoNode = LcChainRetrievalQaV1NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV1AutoConfig>;
};

export type LcChainRetrievalQaV1GuardrailsNode = LcChainRetrievalQaV1NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV1GuardrailsConfig>;
};

export type LcChainRetrievalQaV1DefineNode = LcChainRetrievalQaV1NodeBase & {
	config: NodeConfig<LcChainRetrievalQaV1DefineConfig>;
};

export type LcChainRetrievalQaV1Node =
	| LcChainRetrievalQaV1AutoNode
	| LcChainRetrievalQaV1GuardrailsNode
	| LcChainRetrievalQaV1DefineNode
	;