import os from 'node:os';
import path from 'node:path';
import { nanoid } from 'nanoid';

import { ElementTargetError, McpBrowserError } from './errors';
import type { ElementTarget, ToolResponse } from './types';

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

/**
 * Validate and extract an ElementTarget from raw tool input.
 * Exactly one of `ref` or `selector` must be provided.
 */
export function resolveElementTarget(input: {
	ref?: string;
	selector?: string;
}): ElementTarget {
	const hasRef = input.ref !== undefined && input.ref !== null;
	const hasSelector =
		input.selector !== undefined && input.selector !== null && input.selector !== '';

	if (hasRef && hasSelector) throw new ElementTargetError();
	if (!hasRef && !hasSelector) throw new ElementTargetError();

	if (hasRef) return { ref: input.ref! };
	return { selector: input.selector! };
}

/** Wrap a JSON-serializable result as a successful MCP tool response. */
export function formatToolResponse(data: Record<string, unknown>): ToolResponse {
	return {
		content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
	};
}

/** Wrap an image as a successful MCP tool response with optional metadata. */
export function formatImageResponse(
	base64Data: string,
	metadata?: Record<string, unknown>,
): ToolResponse {
	const content: ToolResponse['content'] = [
		{ type: 'media', data: base64Data, mediaType: 'image/png' },
	];
	if (metadata) {
		content.push({ type: 'text', text: JSON.stringify(metadata, null, 2) });
	}
	return { content };
}

/** Wrap an error as a structured MCP error response. */
export function formatErrorResponse(error: McpBrowserError): ToolResponse {
	const data: Record<string, string> = { error: error.message };
	if (error.hint) data.hint = error.hint;
	return {
		content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
		isError: true,
	};
}
