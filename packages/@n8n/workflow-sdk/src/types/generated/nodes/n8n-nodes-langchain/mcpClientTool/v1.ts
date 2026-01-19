/**
 * MCP Client Tool Node - Version 1
 * Connect tools from an MCP Server
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMcpClientToolV1Params {
/**
 * SSE Endpoint of your MCP server
 */
		sseEndpoint: string | Expression<string>;
/**
 * How to select the tools you want to be exposed to the AI Agent
 * @default all
 */
		include?: 'all' | 'selected' | 'except' | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { include: ["selected"] }
 * @default []
 */
		includeTools?: string[];
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { include: ["except"] }
 * @default []
 */
		excludeTools?: string[];
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMcpClientToolV1Credentials {
	httpBearerAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	mcpOAuth2Api: CredentialReference;
	httpMultipleHeadersAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMcpClientToolV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.mcpClientTool';
	version: 1;
	credentials?: LcMcpClientToolV1Credentials;
	isTrigger: true;
}

export type LcMcpClientToolV1ParamsNode = LcMcpClientToolV1NodeBase & {
	config: NodeConfig<LcMcpClientToolV1Params>;
};

export type LcMcpClientToolV1Node = LcMcpClientToolV1ParamsNode;