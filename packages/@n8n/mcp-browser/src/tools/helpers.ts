import { z } from 'zod';

import { McpBrowserError } from '../errors';
import type { SessionManager } from '../session-manager';
import type { BrowserSession, ToolContext, ToolDefinition, ToolResponse } from '../types';
import { formatErrorResponse, formatToolResponse } from '../utils';

// ---------------------------------------------------------------------------
// Common Zod field schemas reused across tools
// ---------------------------------------------------------------------------

export const sessionIdField = z.string().describe('Session ID from browser_open');
export const pageIdField = z
	.string()
	.optional()
	.describe('Target page/tab ID. Defaults to active page');
export const refField = z
	.string()
	.optional()
	.describe('Element ref from browser_snapshot (preferred)');
export const selectorField = z
	.string()
	.optional()
	.describe('CSS/text/role/XPath selector (fallback — prefer ref)');

// ---------------------------------------------------------------------------
// Tool factory: session-scoped tool with automatic session/page resolution
// ---------------------------------------------------------------------------

/**
 * Create a tool that operates on an existing session.
 * Handles session lookup, TTL touch, page resolution, and error formatting.
 */
export function createSessionTool<TSchema extends z.ZodRawShape>(
	sessionManager: SessionManager,
	name: string,
	description: string,
	inputSchema: TSchema,
	fn: (
		session: BrowserSession,
		input: z.infer<z.ZodObject<TSchema>>,
		pageId: string,
	) => Promise<Record<string, unknown> | ToolResponse>,
): ToolDefinition<z.ZodObject<TSchema>> {
	const schema = z.object(inputSchema);

	return {
		name,
		description,
		inputSchema: schema,
		async execute(args: z.infer<z.ZodObject<TSchema>>, _context: ToolContext) {
			try {
				const sessionId = (args as Record<string, unknown>).sessionId as string;
				const session = sessionManager.get(sessionId);
				sessionManager.touch(sessionId);

				const rawPageId = (args as Record<string, unknown>).pageId as string | undefined;
				const pageId = rawPageId ?? session.activePageId;

				const result = await fn(session, args, pageId);

				// Allow handlers to return a full ToolResponse directly
				if ('content' in result && Array.isArray((result as ToolResponse).content)) {
					return result as ToolResponse;
				}

				return formatToolResponse(result as Record<string, unknown>);
			} catch (error) {
				if (error instanceof McpBrowserError) {
					return formatErrorResponse(error);
				}
				// Re-wrap unexpected errors
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
	};
}
