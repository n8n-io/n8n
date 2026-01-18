/**
 * AI Agent Node - Version 2.2
 * Generates an action plan and executes it. Can use external tools.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV22AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV22GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV22DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

export type LcAgentV22Params =
	| LcAgentV22AutoConfig
	| LcAgentV22GuardrailsConfig
	| LcAgentV22DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAgentV22Node = {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 2.2;
	config: NodeConfig<LcAgentV22Params>;
	credentials?: Record<string, never>;
};