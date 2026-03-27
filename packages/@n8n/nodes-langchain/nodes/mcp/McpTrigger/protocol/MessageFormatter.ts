import type { McpToolResult } from './types';

export class MessageFormatter {
	static formatToolResult(result: unknown, isError = false): McpToolResult {
		let content: McpToolResult['content'];

		if (typeof result === 'object' && result !== null) {
			content = [{ type: 'text', text: JSON.stringify(result) }];
		} else if (typeof result === 'string') {
			content = [{ type: 'text', text: result }];
		} else if (result === null || result === undefined) {
			content = [{ type: 'text', text: String(result) }];
		} else if (
			typeof result === 'number' ||
			typeof result === 'boolean' ||
			typeof result === 'bigint'
		) {
			content = [{ type: 'text', text: result.toString() }];
		} else {
			// Remaining types: symbol, function - convert to string representation
			content = [
				{ type: 'text', text: String(result as symbol | ((...args: unknown[]) => unknown)) },
			];
		}

		return isError ? { isError: true, content } : { content };
	}

	/**
	 * Detect whether a tool result represents an error.
	 *
	 * In direct mode, N8nTool catches errors and returns `e.toString()` producing
	 * strings like `"NodeApiError: Bad request"`. ToolHttpRequest catches HTTP errors
	 * and returns `"There was an error: \"...\"" or `"HTTP 401 There was an error: \"...\""`.
	 *
	 * In queue mode, the job processor wraps errors as `{ error: { message, name } }`.
	 */
	static isErrorResult(result: unknown): boolean {
		if (typeof result === 'object' && result !== null && 'error' in result) {
			return true;
		}
		if (typeof result === 'string') {
			return /^(\w+Error: |HTTP \d{3} There was an error: |There was an error: )/.test(result);
		}
		return false;
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
