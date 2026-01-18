/**
 * MCP Server Trigger Node - Version 1.1
 * Expose n8n tools as an MCP Server endpoint
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMcpTriggerV11Params {
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

export interface LcMcpTriggerV11Credentials {
	httpBearerAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcMcpTriggerV11Node = {
	type: '@n8n/n8n-nodes-langchain.mcpTrigger';
	version: 1.1;
	config: NodeConfig<LcMcpTriggerV11Params>;
	credentials?: LcMcpTriggerV11Credentials;
	isTrigger: true;
};