/**
 * AI Agent Node - Version 1.9
 * Generates an action plan and executes it. Can use external tools.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Describes tools in the system prompt and parses JSON responses for tool calls. More flexible but potentially less reliable than the Tools Agent. Suitable for simpler interactions or with models not supporting structured schemas. */
export type LcAgentV19ConversationalAgentConfig = {
	agent: 'conversationalAgent';
	aiAgentStarterCallout?: unknown;
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Leverages OpenAI's function calling capabilities to precisely select and execute tools. Excellent for tasks requiring structured outputs when working with OpenAI models. */
export type LcAgentV19OpenAiFunctionsAgentConfig = {
	agent: 'openAiFunctionsAgent';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Creates a high-level plan for complex tasks and then executes each step. Suitable for multi-stage problems or when a strategic approach is needed. */
export type LcAgentV19PlanAndExecuteAgentConfig = {
	agent: 'planAndExecuteAgent';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Combines reasoning and action in an iterative process. Effective for tasks that require careful analysis and step-by-step problem-solving. */
export type LcAgentV19ReActAgentConfig = {
	agent: 'reActAgent';
	text: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Specializes in interacting with SQL databases. Ideal for data analysis tasks, generating queries, or extracting insights from structured data. */
export type LcAgentV19SqlAgentConfig = {
	agent: 'sqlAgent';
	text: string | Expression<string>;
/**
 * SQL database to connect to
 * @displayOptions.show { agent: ["sqlAgent"], @version: [{"_cnd":{"lt":1.4}}] }
 * @default sqlite
 */
		dataSource?: 'mysql' | 'postgres' | 'sqlite' | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	input: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type LcAgentV19Params =
	| LcAgentV19ConversationalAgentConfig
	| LcAgentV19OpenAiFunctionsAgentConfig
	| LcAgentV19PlanAndExecuteAgentConfig
	| LcAgentV19ReActAgentConfig
	| LcAgentV19SqlAgentConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcAgentV19Credentials {
	mySql: CredentialReference;
	postgres: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAgentV19Node = {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 | 1.6 | 1.7 | 1.8 | 1.9;
	config: NodeConfig<LcAgentV19Params>;
	credentials?: LcAgentV19Credentials;
};