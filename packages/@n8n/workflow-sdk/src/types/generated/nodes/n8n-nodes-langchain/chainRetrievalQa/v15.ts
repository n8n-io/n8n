/**
 * Question and Answer Chain Node - Version 1.5
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
export type LcChainRetrievalQaV15AutoConfig = {
	promptType: 'auto';
	options?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainRetrievalQaV15GuardrailsConfig = {
	promptType: 'guardrails';
	options?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainRetrievalQaV15DefineConfig = {
	promptType: 'define';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcChainRetrievalQaV15Params =
	| LcChainRetrievalQaV15AutoConfig
	| LcChainRetrievalQaV15GuardrailsConfig
	| LcChainRetrievalQaV15DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChainRetrievalQaV15Node = {
	type: '@n8n/n8n-nodes-langchain.chainRetrievalQa';
	version: 1.5;
	config: NodeConfig<LcChainRetrievalQaV15Params>;
	credentials?: Record<string, never>;
};