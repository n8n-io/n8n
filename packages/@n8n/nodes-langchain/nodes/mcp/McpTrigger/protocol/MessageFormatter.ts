import type { CredentialCheckResult } from 'n8n-workflow';

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
