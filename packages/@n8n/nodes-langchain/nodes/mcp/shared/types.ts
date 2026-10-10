import type { JSONSchema7 } from 'json-schema';
import {
	isMcpGatewayAuthentication,
	isMcpOAuth2Authentication,
	type McpGatewayCredentialType,
	type McpOAuth2CredentialType,
	type McpRegistryCredentialType,
} from 'n8n-workflow';

export type McpTool = { name: string; description?: string; inputSchema: JSONSchema7 };

export type McpServerTransport = 'sse' | 'httpStreamable';

export type McpAuthenticationOption =
	| 'none'
	| 'headerAuth'
	| 'bearerAuth'
	| 'multipleHeadersAuth'
	| McpRegistryCredentialType;

export {
	isMcpGatewayAuthentication,
	isMcpOAuth2Authentication,
	type McpGatewayCredentialType,
	type McpOAuth2CredentialType,
	type McpRegistryCredentialType,
};
