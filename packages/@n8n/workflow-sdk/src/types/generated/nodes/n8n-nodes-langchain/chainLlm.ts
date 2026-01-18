/**
 * Basic LLM Chain Node Types
 *
 * A simple chain to prompt a large language model
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/chainllm/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcChainLlmV19AutoConfig = {
	promptType: 'auto';
	prompt: string | Expression<string>;
	text: string | Expression<string>;
	messages?: Record<string, unknown>;
	/**
	 * Batch processing options for rate limiting
	 * @default {}
	 */
	batching?: Record<string, unknown>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcChainLlmV19GuardrailsConfig = {
	promptType: 'guardrails';
	prompt: string | Expression<string>;
	text: string | Expression<string>;
	messages?: Record<string, unknown>;
	/**
	 * Batch processing options for rate limiting
	 * @default {}
	 */
	batching?: Record<string, unknown>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcChainLlmV19DefineConfig = {
	promptType: 'define';
	prompt: string | Expression<string>;
	text: string | Expression<string>;
	messages?: Record<string, unknown>;
	/**
	 * Batch processing options for rate limiting
	 * @default {}
	 */
	batching?: Record<string, unknown>;
};

export type LcChainLlmV19Params =
	| LcChainLlmV19AutoConfig
	| LcChainLlmV19GuardrailsConfig
	| LcChainLlmV19DefineConfig;

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChainLlmNode = {
	type: '@n8n/n8n-nodes-langchain.chainLlm';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 | 1.6 | 1.7 | 1.8 | 1.9;
	config: NodeConfig<LcChainLlmV19Params>;
	credentials?: Record<string, never>;
};
