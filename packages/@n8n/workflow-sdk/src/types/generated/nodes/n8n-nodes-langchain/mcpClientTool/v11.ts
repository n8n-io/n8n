/**
 * MCP Client Tool Node - Version 1.1
 * Connect tools from an MCP Server
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcMcpClientToolV11Config {
/**
 * The transport used by your endpoint
 * @default sse
 */
		serverTransport?: 'httpStreamable' | 'sse' | Expression<string>;
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

export interface LcMcpClientToolV11Credentials {
	httpBearerAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	mcpOAuth2Api: CredentialReference;
	httpMultipleHeadersAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMcpClientToolV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.mcpClientTool';
	version: 1.1;
	credentials?: LcMcpClientToolV11Credentials;
	isTrigger: true;
}

export type LcMcpClientToolV11Node = LcMcpClientToolV11NodeBase & {
	config: NodeConfig<LcMcpClientToolV11Config>;
};

export type LcMcpClientToolV11Node = LcMcpClientToolV11Node;