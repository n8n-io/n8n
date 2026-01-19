/**
 * AI Agent Node - Version 1.2
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV12AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	text: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV12GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	text: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV12DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV12Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.2;
	credentials?: LcAgentV12Credentials;
}

export type LcAgentV12AutoNode = LcAgentV12NodeBase & {
	config: NodeConfig<LcAgentV12AutoConfig>;
};

export type LcAgentV12GuardrailsNode = LcAgentV12NodeBase & {
	config: NodeConfig<LcAgentV12GuardrailsConfig>;
};

export type LcAgentV12DefineNode = LcAgentV12NodeBase & {
	config: NodeConfig<LcAgentV12DefineConfig>;
};

export type LcAgentV12Node =
	| LcAgentV12AutoNode
	| LcAgentV12GuardrailsNode
	| LcAgentV12DefineNode
	;