/**
 * MCP Server Trigger Node Types
 *
 * Expose n8n tools as an MCP Server endpoint
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mcptrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMcpTriggerV2Params {
	/**
	 * The way to authenticate
	 * @default none
	 */
	authentication?: 'none' | 'bearerAuth' | 'headerAuth' | Expression<string>;
	/**
	 * The base path for this MCP server
	 */
	path: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMcpTriggerV2Credentials {
	httpBearerAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMcpTriggerNode = {
	type: '@n8n/n8n-nodes-langchain.mcpTrigger';
	version: 1 | 1.1 | 2;
	config: NodeConfig<LcMcpTriggerV2Params>;
	credentials?: LcMcpTriggerV2Credentials;
	isTrigger: true;
};
