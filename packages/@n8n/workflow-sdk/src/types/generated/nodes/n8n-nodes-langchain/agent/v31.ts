/**
 * AI Agent Node - Version 3.1
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcAgentV31Params {
	aiAgentStarterCallout?: unknown;
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

interface LcAgentV31NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 3.1;
}

export type LcAgentV31ParamsNode = LcAgentV31NodeBase & {
	config: NodeConfig<LcAgentV31Params>;
};

export type LcAgentV31Node = LcAgentV31ParamsNode;