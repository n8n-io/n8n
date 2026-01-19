/**
 * AI Agent Node - Version 1.5
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV15AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV15GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV15DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

export type LcAgentV15Params =
	| LcAgentV15AutoConfig
	| LcAgentV15GuardrailsConfig
	| LcAgentV15DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV15Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV15NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.5;
	credentials?: LcAgentV15Credentials;
}

export type LcAgentV15AutoNode = LcAgentV15NodeBase & {
	config: NodeConfig<LcAgentV15AutoConfig>;
};

export type LcAgentV15GuardrailsNode = LcAgentV15NodeBase & {
	config: NodeConfig<LcAgentV15GuardrailsConfig>;
};

export type LcAgentV15DefineNode = LcAgentV15NodeBase & {
	config: NodeConfig<LcAgentV15DefineConfig>;
};

export type LcAgentV15Node =
	| LcAgentV15AutoNode
	| LcAgentV15GuardrailsNode
	| LcAgentV15DefineNode
	;