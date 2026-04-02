import { nanoid } from 'nanoid';
import os from 'node:os';
import path from 'node:path';

import type { McpBrowserError } from './errors';
import type { CallToolResult } from './types';

/**
 * Expand a leading `~` to the user's home directory.
 * Works cross-platform (macOS, Linux, Windows).
 */
export function expandHome(p: string): string {
	if (p.startsWith('~')) {
		return path.join(os.homedir(), p.slice(1));
	}
	return p;
}

/** Generate a prefixed unique ID (e.g. `sess_a1b2c3d4e5f6`). */
export function generateId(prefix: string): string {
	return `${prefix}_${nanoid(12)}`;
}

/** Wrap a JSON-serializable result as a successful MCP tool response. */
export function formatCallToolResult(data: Record<string, unknown>): CallToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
		structuredContent: data,
	};
}

/** Wrap an image as a successful MCP tool response with optional metadata. */
export function formatImageResponse(
	base64Data: string,
	metadata?: Record<string, unknown>,
): CallToolResult {
	const content: CallToolResult['content'] = [
		{ type: 'image', data: base64Data, mimeType: 'image/png' },
	];
	if (metadata) {
		content.push({ type: 'text', text: JSON.stringify(metadata, null, 2) });
	}
	return { content };
}

/** Coerce an unknown caught value into an Error instance. */
export function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(String(value));
}

/** Wrap an error as a structured MCP error response. */
export function formatErrorResponse(error: McpBrowserError): CallToolResult {
	const data: Record<string, string> = { error: error.message };
	if (error.hint) data.hint = error.hint;
	return {
		content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
		structuredContent: data,
		isError: true,
	};
}
