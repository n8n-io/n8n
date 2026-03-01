import type { McpToolResult } from './types';

export class MessageFormatter {
	static formatToolResult(result: unknown): McpToolResult {
		if (typeof result === 'object' && result !== null) {
			return { content: [{ type: 'text', text: JSON.stringify(result) }] };
		}
		if (typeof result === 'string') {
			return { content: [{ type: 'text', text: result }] };
		}
		if (result === null || result === undefined) {
			return { content: [{ type: 'text', text: String(result) }] };
		}
		if (typeof result === 'number' || typeof result === 'boolean' || typeof result === 'bigint') {
			return { content: [{ type: 'text', text: result.toString() }] };
		}
		// Remaining types: symbol, function - convert to string representation
		return {
			content: [
				{ type: 'text', text: String(result as symbol | ((...args: unknown[]) => unknown)) },
			],
		};
	}

	static formatError(error: Error): McpToolResult {
		const errorDetails = [`${error.name}: ${error.message}`];
		if (error.stack) {
			errorDetails.push(error.stack);
		}
		return {
			isError: true,
			content: [{ type: 'text', text: errorDetails.join('\n') }],
		};
	}
}
