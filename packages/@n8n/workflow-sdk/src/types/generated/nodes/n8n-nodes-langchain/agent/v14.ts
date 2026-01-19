/**
 * AI Agent Node - Version 1.4
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV14AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV14GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV14DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

export type LcAgentV14Params =
	| LcAgentV14AutoConfig
	| LcAgentV14GuardrailsConfig
	| LcAgentV14DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV14Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV14NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.4;
	credentials?: LcAgentV14Credentials;
}

export type LcAgentV14AutoNode = LcAgentV14NodeBase & {
	config: NodeConfig<LcAgentV14AutoConfig>;
};

export type LcAgentV14GuardrailsNode = LcAgentV14NodeBase & {
	config: NodeConfig<LcAgentV14GuardrailsConfig>;
};

export type LcAgentV14DefineNode = LcAgentV14NodeBase & {
	config: NodeConfig<LcAgentV14DefineConfig>;
};

export type LcAgentV14Node =
	| LcAgentV14AutoNode
	| LcAgentV14GuardrailsNode
	| LcAgentV14DefineNode
	;