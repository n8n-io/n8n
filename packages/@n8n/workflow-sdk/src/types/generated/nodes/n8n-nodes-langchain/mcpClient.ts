/**
 * MCP Client Node Types
 *
 * Standalone MCP Client
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mcpclient/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export type LcMcpClientV1BearerAuthConfig = {
	authentication: 'bearerAuth';
	/**
	 * The transport used by your endpoint
	 * @default httpStreamable
	 */
	serverTransport?: 'httpStreamable' | 'sse' | Expression<string>;
	/**
	 * The URL of the MCP server to connect to
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The tool to use
	 * @default {"mode":"list","value":""}
	 */
	tool: ResourceLocatorValue;
	inputMode?: 'manual' | 'json' | Expression<string>;
	parameters: string | Expression<string>;
	jsonInput?: IDataObject | string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

export type LcMcpClientV1HeaderAuthConfig = {
	authentication: 'headerAuth';
	/**
	 * The transport used by your endpoint
	 * @default httpStreamable
	 */
	serverTransport?: 'httpStreamable' | 'sse' | Expression<string>;
	/**
	 * The URL of the MCP server to connect to
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The tool to use
	 * @default {"mode":"list","value":""}
	 */
	tool: ResourceLocatorValue;
	inputMode?: 'manual' | 'json' | Expression<string>;
	parameters: string | Expression<string>;
	jsonInput?: IDataObject | string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

export type LcMcpClientV1McpOAuth2ApiConfig = {
	authentication: 'mcpOAuth2Api';
	/**
	 * The transport used by your endpoint
	 * @default httpStreamable
	 */
	serverTransport?: 'httpStreamable' | 'sse' | Expression<string>;
	/**
	 * The URL of the MCP server to connect to
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The tool to use
	 * @default {"mode":"list","value":""}
	 */
	tool: ResourceLocatorValue;
	inputMode?: 'manual' | 'json' | Expression<string>;
	parameters: string | Expression<string>;
	jsonInput?: IDataObject | string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

export type LcMcpClientV1MultipleHeadersAuthConfig = {
	authentication: 'multipleHeadersAuth';
	/**
	 * The transport used by your endpoint
	 * @default httpStreamable
	 */
	serverTransport?: 'httpStreamable' | 'sse' | Expression<string>;
	/**
	 * The URL of the MCP server to connect to
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The tool to use
	 * @default {"mode":"list","value":""}
	 */
	tool: ResourceLocatorValue;
	inputMode?: 'manual' | 'json' | Expression<string>;
	parameters: string | Expression<string>;
	jsonInput?: IDataObject | string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

export type LcMcpClientV1NoneConfig = {
	authentication: 'none';
	/**
	 * The transport used by your endpoint
	 * @default httpStreamable
	 */
	serverTransport?: 'httpStreamable' | 'sse' | Expression<string>;
	/**
	 * The URL of the MCP server to connect to
	 */
	endpointUrl: string | Expression<string>;
	/**
	 * The tool to use
	 * @default {"mode":"list","value":""}
	 */
	tool: ResourceLocatorValue;
	inputMode?: 'manual' | 'json' | Expression<string>;
	parameters: string | Expression<string>;
	jsonInput?: IDataObject | string | Expression<string>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

export type LcMcpClientV1Params =
	| LcMcpClientV1BearerAuthConfig
	| LcMcpClientV1HeaderAuthConfig
	| LcMcpClientV1McpOAuth2ApiConfig
	| LcMcpClientV1MultipleHeadersAuthConfig
	| LcMcpClientV1NoneConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcMcpClientV1Credentials {
	httpBearerAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	mcpOAuth2Api: CredentialReference;
	httpMultipleHeadersAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcMcpClientV1Node = {
	type: '@n8n/n8n-nodes-langchain.mcpClient';
	version: 1;
	config: NodeConfig<LcMcpClientV1Params>;
	credentials?: LcMcpClientV1Credentials;
};

export type LcMcpClientNode = LcMcpClientV1Node;
