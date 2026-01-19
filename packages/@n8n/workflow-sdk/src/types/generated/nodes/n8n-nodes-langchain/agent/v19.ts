/**
 * AI Agent Node - Version 1.9
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV19AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV19GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV19DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV19Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV19NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.9;
	credentials?: LcAgentV19Credentials;
}

export type LcAgentV19AutoNode = LcAgentV19NodeBase & {
	config: NodeConfig<LcAgentV19AutoConfig>;
};

export type LcAgentV19GuardrailsNode = LcAgentV19NodeBase & {
	config: NodeConfig<LcAgentV19GuardrailsConfig>;
};

export type LcAgentV19DefineNode = LcAgentV19NodeBase & {
	config: NodeConfig<LcAgentV19DefineConfig>;
};

export type LcAgentV19Node =
	| LcAgentV19AutoNode
	| LcAgentV19GuardrailsNode
	| LcAgentV19DefineNode
	;