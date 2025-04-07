import type { JSONSchema7 } from 'json-schema';

export type McpSseCredential = {
	sseEndpoint: string;
	authEnabled: boolean;
} & ({ authEnabled: true; token: string } | { authEnabled: false });

export type McpTool = { name: string; description?: string; inputSchema: JSONSchema7 };

export type McpToolIncludeMode = 'all' | 'selected' | 'except';
