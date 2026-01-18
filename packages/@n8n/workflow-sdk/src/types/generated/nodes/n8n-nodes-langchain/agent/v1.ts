/**
 * AI Agent Node - Version 1
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

export type LcAgentV1Params =
	| LcAgentV1AutoConfig
	| LcAgentV1GuardrailsConfig
	| LcAgentV1DefineConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV1Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAgentV1Node = {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1;
	config: NodeConfig<LcAgentV1Params>;
	credentials?: LcAgentV1Credentials;
};