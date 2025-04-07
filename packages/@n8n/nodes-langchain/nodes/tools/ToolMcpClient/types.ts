import type { JSONSchema7 } from 'json-schema';

export type McpSseCredential = {
	url: string;
	authEnabled: boolean;
	customEndpoints: boolean;
} & ({ authEnabled: true; token: string } | { authEnabled: false }) &
	(
		| { customEndpoints: true; sseEndpoint: string; messagesEndpoint: string }
		| { customEndpoints: false }
	);

export type McpTool = { name: string; description?: string; inputSchema: JSONSchema7 };

export type McpToolIncludeMode = 'all' | 'selected' | 'except';
