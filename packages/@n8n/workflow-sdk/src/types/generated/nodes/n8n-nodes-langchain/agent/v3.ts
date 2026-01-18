/**
 * AI Agent Node - Version 3
 * Generates an action plan and executes it. Can use external tools.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type LcAgentV3Node = {
	type: '@n8n/n8n-nodes-langchain.agent';
	version: 3;
	config: NodeConfig<LcAgentV3Params>;
	credentials?: Record<string, never>;
};