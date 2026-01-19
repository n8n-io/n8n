/**
 * AI Agent Node - Version 2
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV2AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV2GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV2DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

export type LcAgentV2Params =
	| LcAgentV2AutoConfig
	| LcAgentV2GuardrailsConfig
	| LcAgentV2DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV2NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 2;
}

export type LcAgentV2AutoNode = LcAgentV2NodeBase & {
	config: NodeConfig<LcAgentV2AutoConfig>;
};

export type LcAgentV2GuardrailsNode = LcAgentV2NodeBase & {
	config: NodeConfig<LcAgentV2GuardrailsConfig>;
};

export type LcAgentV2DefineNode = LcAgentV2NodeBase & {
	config: NodeConfig<LcAgentV2DefineConfig>;
};

export type LcAgentV2Node =
	| LcAgentV2AutoNode
	| LcAgentV2GuardrailsNode
	| LcAgentV2DefineNode
	;