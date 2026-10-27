import type { CredentialCheckResult } from 'n8n-workflow';

import { isToolErrorResult } from '@utils/tool-error-result';

import type { McpToolResult } from './types';
import { isMcpContentArray, type McpContentBlock } from '../../shared/utils';

/**
 * Parse a tool result string that may be a JSON-serialized MCP content array.
 *
 * Proxy mode passes the tool result through `DynamicStructuredTool.invoke`,
 * which serializes the tool's return value to a string before it leaves the
 * tool. The raw content array therefore arrives here as JSON text. Malformed
 * JSON and JSON that is not an MCP content array return `null` so the caller
 * wraps the original string.
 */
function parseMcpContentArrayString(value: string): McpContentBlock[] | null {
	try {
		const parsed: unknown = JSON.parse(value);
		return isMcpContentArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Result of presenting a single missing credential's connection URL to the
 * client via URL-mode elicitation. `action` mirrors the MCP `ElicitResult`
 * actions: `accept` (the client opened the connection page), `decline`, or
 * `cancel`.
 */
export interface CredentialGateElicitationOutcome {
	credentialName: string;
	credentialType: string;
	action: 'accept' | 'decline' | 'cancel';
}

export class MessageFormatter {
	static formatToolResult(result: unknown, isError = false, isFromMcpTool = false): McpToolResult {
		let content: McpContentBlock[];

		if (isFromMcpTool && isMcpContentArray(result)) {
			content = result; // pass-through
		} else if (typeof result === 'object' && result !== null) {
			content = [{ type: 'text' as const, text: JSON.stringify(result) }];
		} else if (typeof result === 'string') {
			// Proxy mode hands us a JSON string, so parse before wrapping. A failed
			// parse or a non-MCP value falls back to the original string, never the
			// parsed value.
			const parsedContent = isFromMcpTool ? parseMcpContentArrayString(result) : null;
			content = parsedContent ?? [{ type: 'text' as const, text: result }];
		} else if (result === null || result === undefined) {
			content = [{ type: 'text' as const, text: String(result) }];
		} else if (
			typeof result === 'number' ||
			typeof result === 'boolean' ||
			typeof result === 'bigint'
		) {
			content = [{ type: 'text' as const, text: result.toString() }];
		} else {
			// Remaining types: symbol, function - convert to string representation
			content = [
				{
					type: 'text' as const,
					text: String(result),
				},
			];
		}

		return isError ? { isError: true, content } : { content };
	}

	static isErrorResult(result: unknown): boolean {
		return isToolErrorResult(result);
	}

	static formatError(error: Error): McpToolResult {
		return {
			isError: true,
			content: [{ type: 'text' as const, text: `${error.name}: ${error.message}` }],
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
			content: [{ type: 'text' as const, text }],
			credentialGate: result,
		};
	}

	/**
	 * Formats the outcome of driving the credential gate through URL-mode
	 * elicitation. Clients that support elicitation surface the connection page
	 * themselves, so the response only needs to tell the caller what to do next:
	 * retry once the opened page(s) are connected, and which credentials (if any)
	 * were left unconnected. Flagged as an error only when something still needs
	 * connecting so the client keeps prompting.
	 */
	static formatCredentialGateElicited(outcomes: CredentialGateElicitationOutcome[]): McpToolResult {
		const opened = outcomes.filter((o) => o.action === 'accept');
		const skipped = outcomes.filter((o) => o.action !== 'accept');

		const lines: string[] = [];
		if (opened.length) {
			lines.push(
				'A connection page was opened for the following credential(s). Once connected, retry the request:',
				...opened.map((o) => `- ${o.credentialName} (${o.credentialType})`),
			);
		}
		if (skipped.length) {
			lines.push(
				'These credentials still need to be connected before the tool can run:',
				...skipped.map((o) => `- ${o.credentialName} (${o.credentialType})`),
			);
		}

		const content = [{ type: 'text' as const, text: lines.join('\n') }];
		// Omit `isError` when nothing is left to connect, matching formatToolResult.
		return skipped.length > 0 ? { isError: true, content } : { content };
	}
}
