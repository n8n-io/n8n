/**
 * AI Agent Node - Version 1.1
 * Generates an action plan and executes it. Can use external tools.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger */
export type LcAgentV11AutoConfig = {
	promptType: 'auto';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	text: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Looks for an input field called 'guardrailsInput' that is coming from a directly connected Guardrails Node */
export type LcAgentV11GuardrailsConfig = {
	promptType: 'guardrails';
	aiAgentStarterCallout?: unknown;
	options?: Record<string, unknown>;
	text: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Use an expression to reference data in previous nodes or enter static text */
export type LcAgentV11DefineConfig = {
	promptType: 'define';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
};

export type LcAgentV11Params =
	| LcAgentV11AutoConfig
	| LcAgentV11GuardrailsConfig
	| LcAgentV11DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV11Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAgentV11Node = {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1.1;
	config: NodeConfig<LcAgentV11Params>;
	credentials?: LcAgentV11Credentials;
};