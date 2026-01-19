/**
 * AI Agent Node - Version 2.2
 * Generates an action plan and executes it. Can use external tools.
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


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV22NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 2.2;
}

export type LcAgentV22AutoNode = LcAgentV22NodeBase & {
	config: NodeConfig<LcAgentV22AutoConfig>;
};

export type LcAgentV22GuardrailsNode = LcAgentV22NodeBase & {
	config: NodeConfig<LcAgentV22GuardrailsConfig>;
};

export type LcAgentV22DefineNode = LcAgentV22NodeBase & {
	config: NodeConfig<LcAgentV22DefineConfig>;
};

export type LcAgentV22Node =
	| LcAgentV22AutoNode
	| LcAgentV22GuardrailsNode
	| LcAgentV22DefineNode
	;