import type { JSONSchema7 } from 'json-schema';
import { isMcpOAuth2Authentication, type McpOAuth2CredentialType } from 'n8n-workflow';

export type McpToolAnnotations = {
	title?: string;
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
};

export type McpTool = {
	name: string;
	description?: string;
	inputSchema: JSONSchema7;
	annotations?: McpToolAnnotations;
};

export type McpServerTransport = 'sse' | 'httpStreamable';

export type McpAuthenticationOption =
	| 'none'
	| 'headerAuth'
	| 'bearerAuth'
	| 'multipleHeadersAuth'
	| McpOAuth2CredentialType;

export { isMcpOAuth2Authentication, type McpOAuth2CredentialType };
