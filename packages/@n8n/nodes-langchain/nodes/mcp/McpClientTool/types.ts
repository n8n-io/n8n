import type { JSONSchema7 } from 'json-schema';

export type McpTool = { name: string; description?: string; inputSchema: JSONSchema7 };

export type McpServerTransport = 'sse' | 'httpStreamable';

export type McpToolIncludeMode = 'all' | 'selected' | 'except';

export type McpAuthenticationOption = 'none' | 'headerAuth' | 'bearerAuth';
