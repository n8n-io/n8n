/**
 * AI Agent Tool Node - Version 3
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcAgentToolV3Config {
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
// Node Types
// ===========================================================================

interface LcAgentToolV3NodeBase {
	type: '@n8n/n8n-nodes-langchain.agentTool';
	version: 3;
}

export type LcAgentToolV3Node = LcAgentToolV3NodeBase & {
	config: NodeConfig<LcAgentToolV3Config>;
};

export type LcAgentToolV3Node = LcAgentToolV3Node;