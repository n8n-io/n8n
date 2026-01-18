/**
 * AI Agent Tool Node Types
 *
 * Generates an action plan and executes it. Can use external tools.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/agenttool/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcAgentToolV3Params {
	/**
	 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
	 * @default AI Agent that can call other tools
	 */
	toolDescription: string | Expression<string>;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
	needsFallback?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

export interface LcAgentToolV22Params {
	/**
	 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
	 * @default AI Agent that can call other tools
	 */
	toolDescription: string | Expression<string>;
	text: string | Expression<string>;
	hasOutputParser?: boolean | Expression<boolean>;
	needsFallback?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAgentToolNode = {
	type: '@n8n/n8n-nodes-langchain.agentTool';
	version: 2.2 | 3;
	config: NodeConfig<LcAgentToolV3Params>;
	credentials?: Record<string, never>;
};
