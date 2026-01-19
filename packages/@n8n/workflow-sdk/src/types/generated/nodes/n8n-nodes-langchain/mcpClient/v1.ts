/**
 * MCP Client Node - Version 1
 * Standalone MCP Client
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

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

interface LcMcpClientV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.mcpClient';
	version: 1;
	credentials?: LcMcpClientV1Credentials;
}

export type LcMcpClientV1BearerAuthNode = LcMcpClientV1NodeBase & {
	config: NodeConfig<LcMcpClientV1BearerAuthConfig>;
};

export type LcMcpClientV1HeaderAuthNode = LcMcpClientV1NodeBase & {
	config: NodeConfig<LcMcpClientV1HeaderAuthConfig>;
};

export type LcMcpClientV1McpOAuth2ApiNode = LcMcpClientV1NodeBase & {
	config: NodeConfig<LcMcpClientV1McpOAuth2ApiConfig>;
};

export type LcMcpClientV1MultipleHeadersAuthNode = LcMcpClientV1NodeBase & {
	config: NodeConfig<LcMcpClientV1MultipleHeadersAuthConfig>;
};

export type LcMcpClientV1NoneNode = LcMcpClientV1NodeBase & {
	config: NodeConfig<LcMcpClientV1NoneConfig>;
};

export type LcMcpClientV1Node =
	| LcMcpClientV1BearerAuthNode
	| LcMcpClientV1HeaderAuthNode
	| LcMcpClientV1McpOAuth2ApiNode
	| LcMcpClientV1MultipleHeadersAuthNode
	| LcMcpClientV1NoneNode
	;