/**
 * Question and Answer Chain Node - Version 1.2
 * Answer questions about retrieved documents
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainRetrievalQaV12AutoConfig = {
	promptType: 'auto';
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV12GuardrailsConfig = {
	promptType: 'guardrails';
	query: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV12DefineConfig = {
	promptType: 'define';
	query: string | Expression<string>;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcChainRetrievalQaV12Params =
	| LcChainRetrievalQaV12AutoConfig
	| LcChainRetrievalQaV12GuardrailsConfig
	| LcChainRetrievalQaV12DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChainRetrievalQaV12Node = {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.2;
	config: NodeConfig<LcChainRetrievalQaV12Params>;
	credentials?: Record<string, never>;
};