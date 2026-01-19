/**
 * AI Agent Node - Version 1.7
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV17AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV17GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV17DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV17Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV17NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.7;
	credentials?: LcAgentV17Credentials;
}

export type LcAgentV17AutoNode = LcAgentV17NodeBase & {
	config: NodeConfig<LcAgentV17AutoConfig>;
};

export type LcAgentV17GuardrailsNode = LcAgentV17NodeBase & {
	config: NodeConfig<LcAgentV17GuardrailsConfig>;
};

export type LcAgentV17DefineNode = LcAgentV17NodeBase & {
	config: NodeConfig<LcAgentV17DefineConfig>;
};

export type LcAgentV17Node =
	| LcAgentV17AutoNode
	| LcAgentV17GuardrailsNode
	| LcAgentV17DefineNode
	;