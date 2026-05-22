import type { JSONSchema7 } from 'json-schema';

export type McpTool = { name: string; description?: string; inputSchema: JSONSchema7 };

export type McpServerTransport = 'sse' | 'httpStreamable';

export type McpOAuth2CredentialType =
	| 'mcpOAuth2Api'
	| `${string}McpOAuth2Api`
	| `${string}OAuth2${string}`;

export type McpAuthenticationOption =
	| 'none'
	| 'headerAuth'
	| 'bearerAuth'
	| 'multipleHeadersAuth'
	| McpOAuth2CredentialType;

export function isMcpOAuth2Authentication(
	authentication: string,
): authentication is McpOAuth2CredentialType {
	return authentication === 'mcpOAuth2Api' || authentication.includes('OAuth2');
}
