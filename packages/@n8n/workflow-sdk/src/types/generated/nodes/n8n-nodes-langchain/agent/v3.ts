/**
 * AI Agent Node - Version 3
 * Generates an action plan and executes it. Can use external tools.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcAgentV3Params {
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

interface LcAgentV3NodeBase {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 3;
}

export type LcAgentV3ParamsNode = LcAgentV3NodeBase & {
	config: NodeConfig<LcAgentV3Params>;
};

export type LcAgentV3Node = LcAgentV3ParamsNode;