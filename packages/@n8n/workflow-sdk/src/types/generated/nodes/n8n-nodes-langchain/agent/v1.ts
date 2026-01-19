/**
 * AI Agent Node - Version 1
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV1AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	text: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV1GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	text: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV1DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV1Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcAgentV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1;
	credentials?: LcAgentV1Credentials;
}

export type LcAgentV1AutoNode = LcAgentV1NodeBase & {
	config: NodeConfig<LcAgentV1AutoConfig>;
};

export type LcAgentV1GuardrailsNode = LcAgentV1NodeBase & {
	config: NodeConfig<LcAgentV1GuardrailsConfig>;
};

export type LcAgentV1DefineNode = LcAgentV1NodeBase & {
	config: NodeConfig<LcAgentV1DefineConfig>;
};

export type LcAgentV1Node =
	| LcAgentV1AutoNode
	| LcAgentV1GuardrailsNode
	| LcAgentV1DefineNode
	;