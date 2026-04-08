import type { CallToolResult } from './types';

/** Wrap a JSON-serializable result as a successful MCP tool response with structuredContent. */
export function formatCallToolResult(data: Record<string, unknown>): CallToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(data) }],
		structuredContent: data,
	};
}

/** Wrap an error message as a structured MCP error response. */
export function formatErrorResult(message: string): CallToolResult {
	const data = { error: message };
	return {
		content: [{ type: 'text', text: JSON.stringify(data) }],
		structuredContent: data,
		isError: true,
	};
}
