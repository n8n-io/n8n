/**
 * Question and Answer Chain Node - Version 1.6
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
export type LcChainRetrievalQaV16AutoConfig = {
	promptType: 'auto';
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV16GuardrailsConfig = {
	promptType: 'guardrails';
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV16DefineConfig = {
	promptType: 'define';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcChainRetrievalQaV16Params =
	| LcChainRetrievalQaV16AutoConfig
	| LcChainRetrievalQaV16GuardrailsConfig
	| LcChainRetrievalQaV16DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChainRetrievalQaV16Node = {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.6;
	config: NodeConfig<LcChainRetrievalQaV16Params>;
	credentials?: Record<string, never>;
};