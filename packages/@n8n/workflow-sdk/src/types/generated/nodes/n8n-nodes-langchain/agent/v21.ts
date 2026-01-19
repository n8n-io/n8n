/**
 * AI Agent Node - Version 2.1
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV21AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV21GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV21DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
};

export type LcAgentV21Params =
	| LcAgentV21AutoConfig
	| LcAgentV21GuardrailsConfig
	| LcAgentV21DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV21NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 2.1;
}

export type LcAgentV21AutoNode = LcAgentV21NodeBase & {
	config: NodeConfig<LcAgentV21AutoConfig>;
};

export type LcAgentV21GuardrailsNode = LcAgentV21NodeBase & {
	config: NodeConfig<LcAgentV21GuardrailsConfig>;
};

export type LcAgentV21DefineNode = LcAgentV21NodeBase & {
	config: NodeConfig<LcAgentV21DefineConfig>;
};

export type LcAgentV21Node =
	| LcAgentV21AutoNode
	| LcAgentV21GuardrailsNode
	| LcAgentV21DefineNode
	;