/**
 * MCP Client Tool Node Types
 *
 * Connect tools from an MCP Server
 * @subnodeType ai_tool
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mcpclienttool/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type LcMcpClientToolV12BearerAuthConfig = {
	authentication: 'bearerAuth';
	/**
	 * SSE Endpoint of your MCP server
	 * @displayOptions.show { @version: [1] }
	 */
	sseEndpoint: string | Expression<string>;
	/**
	 * Endpoint of your MCP server
	 * @displayOptions.show { @version: [{"_cnd":{"gte":1.1}}] }
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The transport used by your endpoint
	 * @displayOptions.show { @version: [1.1] }
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
};

export type LcMcpClientToolV12HeaderAuthConfig = {
	authentication: 'headerAuth';
	/**
	 * SSE Endpoint of your MCP server
	 * @displayOptions.show { @version: [1] }
	 */
	sseEndpoint: string | Expression<string>;
	/**
	 * Endpoint of your MCP server
	 * @displayOptions.show { @version: [{"_cnd":{"gte":1.1}}] }
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The transport used by your endpoint
	 * @displayOptions.show { @version: [1.1] }
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
};

export type LcMcpClientToolV12NoneConfig = {
	authentication: 'none';
	/**
	 * SSE Endpoint of your MCP server
	 * @displayOptions.show { @version: [1] }
	 */
	sseEndpoint: string | Expression<string>;
	/**
	 * Endpoint of your MCP server
	 * @displayOptions.show { @version: [{"_cnd":{"gte":1.1}}] }
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The transport used by your endpoint
	 * @displayOptions.show { @version: [1.1] }
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
};

export type LcMcpClientToolV12Params =
	| LcMcpClientToolV12BearerAuthConfig
	| LcMcpClientToolV12HeaderAuthConfig
	| LcMcpClientToolV12NoneConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMcpClientToolV12Credentials {
	httpBearerAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	mcpOAuth2Api: CredentialReference;
	httpMultipleHeadersAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcMcpClientToolV12Node = {
	type: '@n8n/n8n-nodes-langchain.mcpClientTool';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<LcMcpClientToolV12Params>;
	credentials?: LcMcpClientToolV12Credentials;
	isTrigger: true;
};

export type LcMcpClientToolNode = LcMcpClientToolV12Node;
