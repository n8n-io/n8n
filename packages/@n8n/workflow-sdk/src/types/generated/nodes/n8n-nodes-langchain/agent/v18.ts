/**
 * AI Agent Node - Version 1.8
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV18AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV18GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV18DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

export type LcAgentV18Params =
	| LcAgentV18AutoConfig
	| LcAgentV18GuardrailsConfig
	| LcAgentV18DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV18Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV18NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.8;
	credentials?: LcAgentV18Credentials;
}

export type LcAgentV18AutoNode = LcAgentV18NodeBase & {
	config: NodeConfig<LcAgentV18AutoConfig>;
};

export type LcAgentV18GuardrailsNode = LcAgentV18NodeBase & {
	config: NodeConfig<LcAgentV18GuardrailsConfig>;
};

export type LcAgentV18DefineNode = LcAgentV18NodeBase & {
	config: NodeConfig<LcAgentV18DefineConfig>;
};

export type LcAgentV18Node =
	| LcAgentV18AutoNode
	| LcAgentV18GuardrailsNode
	| LcAgentV18DefineNode
	;