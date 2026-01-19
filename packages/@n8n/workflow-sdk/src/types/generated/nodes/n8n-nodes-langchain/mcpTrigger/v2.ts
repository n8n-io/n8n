/**
 * MCP Server Trigger Node - Version 2
 * Expose n8n tools as an MCP Server endpoint
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMcpTriggerV2Config {
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
// Node Types
// ===========================================================================

interface LcMcpTriggerV2NodeBase {
	type: '@n8n/n8n-nodes-langchain.mcpTrigger';
	version: 2;
	credentials?: LcMcpTriggerV2Credentials;
	isTrigger: true;
}

export type LcMcpTriggerV2Node = LcMcpTriggerV2NodeBase & {
	config: NodeConfig<LcMcpTriggerV2Config>;
};

export type LcMcpTriggerV2Node = LcMcpTriggerV2Node;