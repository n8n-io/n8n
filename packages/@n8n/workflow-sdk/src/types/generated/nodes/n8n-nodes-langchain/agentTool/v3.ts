/**
 * AI Agent Tool Node - Version 3
 * Generates an action plan and executes it. Can use external tools.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcAgentToolV3Node = {
	type: '@n8n/n8n-nodes-langchain.agentTool';
	version: 3;
	config: NodeConfig<LcAgentToolV3Params>;
	credentials?: Record<string, never>;
};