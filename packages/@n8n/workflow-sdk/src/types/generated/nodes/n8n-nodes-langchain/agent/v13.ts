/**
 * AI Agent Node - Version 1.3
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV13AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV13GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV13DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV13Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.3;
	credentials?: LcAgentV13Credentials;
}

export type LcAgentV13AutoNode = LcAgentV13NodeBase & {
	config: NodeConfig<LcAgentV13AutoConfig>;
};

export type LcAgentV13GuardrailsNode = LcAgentV13NodeBase & {
	config: NodeConfig<LcAgentV13GuardrailsConfig>;
};

export type LcAgentV13DefineNode = LcAgentV13NodeBase & {
	config: NodeConfig<LcAgentV13DefineConfig>;
};

export type LcAgentV13Node =
	| LcAgentV13AutoNode
	| LcAgentV13GuardrailsNode
	| LcAgentV13DefineNode
	;