/**
 * AI Agent Node - Version 1.6
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV16AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV16GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV16DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV16Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV16NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.6;
	credentials?: LcAgentV16Credentials;
}

export type LcAgentV16AutoNode = LcAgentV16NodeBase & {
	config: NodeConfig<LcAgentV16AutoConfig>;
};

export type LcAgentV16GuardrailsNode = LcAgentV16NodeBase & {
	config: NodeConfig<LcAgentV16GuardrailsConfig>;
};

export type LcAgentV16DefineNode = LcAgentV16NodeBase & {
	config: NodeConfig<LcAgentV16DefineConfig>;
};

export type LcAgentV16Node =
	| LcAgentV16AutoNode
	| LcAgentV16GuardrailsNode
	| LcAgentV16DefineNode
	;