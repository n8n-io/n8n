import type { CredentialCheckResult } from 'n8n-workflow';

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
			const { error } = result as { error: unknown };
			return (
				typeof error === 'object' &&
				error !== null &&
				'message' in error &&
				typeof (error as { message: unknown }).message === 'string'
			);
		}
		if (typeof result === 'string') {
			return /^(\w+Error: |HTTP \d{3} There was an error: |There was an error: )/.test(result);
		}
		return false;
	}

	static formatError(error: Error): McpToolResult {
		return {
			isError: true,
			content: [{ type: 'text', text: `${error.name}: ${error.message}` }],
		};
	}

	/**
	 * Formats a not-ready credential gate into an actionable MCP tool response: the
	 * workflow did not run because the calling user has not connected one or more
	 * required credentials. Each missing credential is listed with its connection
	 * URL so the client can prompt the user to connect and retry.
	 */
	static formatCredentialGate(result: CredentialCheckResult): McpToolResult {
		const missing = result.credentials.filter((c) => c.status !== 'configured');

		// The connection URL is emitted raw on its own line (not wrapped in prose),
		// so the client can surface it verbatim without mangling the link.
		const lines = missing.flatMap((c) => {
			const label = `- ${c.credentialName} (${c.credentialType})`;
			return c.authorizationUrl ? [label, c.authorizationUrl] : [`${label}: not connected`];
		});

		const text = [
			'This tool requires credentials that are not connected for your account yet.',
			'Connect each of the following, then retry the request:',
			...lines,
		].join('\n');

		return {
			isError: true,
			content: [{ type: 'text', text }],
			credentialGate: result,
		};
	}
}
