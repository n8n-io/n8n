import type { JSONSchema7 } from 'json-schema';
import { isMcpOAuth2Authentication, type McpOAuth2CredentialType } from 'n8n-workflow';

export type McpTool = { name: string; description?: string; inputSchema: JSONSchema7 };

export type McpServerTransport = 'sse' | 'httpStreamable';

export type McpAuthenticationOption = string;

export { isMcpOAuth2Authentication, type McpOAuth2CredentialType };
