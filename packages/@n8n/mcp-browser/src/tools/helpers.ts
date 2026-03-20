import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { McpBrowserError } from '../errors';
import type { ConnectionState, ToolContext, ToolDefinition, CallToolResult } from '../types';
import { formatErrorResponse } from '../utils';

// ---------------------------------------------------------------------------
// Connected tool input constraint — every tool must have at least pageId
// ---------------------------------------------------------------------------

type ConnectedToolInput = { pageId?: string };

// ---------------------------------------------------------------------------
// Common Zod field schemas reused across tools
// ---------------------------------------------------------------------------

export const pageIdField = z
	.string()
	.optional()
	.describe('Target page/tab ID. Defaults to active page');

/** Element target: exactly one of ref or selector. Prefer ref from browser_snapshot. */
const refTargetSchema = z.object({
	ref: z.string().describe('Element ref from browser_snapshot (preferred)'),
});
const selectorTargetSchema = z.object({
	selector: z.string().describe('CSS/text/role/XPath selector (fallback — prefer ref)'),
});
export const elementTargetSchema = z.union([refTargetSchema, selectorTargetSchema]);

export type ElementTargetInput = z.infer<typeof elementTargetSchema>;

// ---------------------------------------------------------------------------
// Tool factory: connection-scoped tool with automatic page resolution
// ---------------------------------------------------------------------------

/**
 * Create a tool that operates on the active browser connection.
 * Handles connection lookup, page resolution, and error formatting.
 *
 * Accepts either:
 *  - a ZodRawShape (auto-wrapped in z.object)
 *  - a pre-built ZodType (for unions, intersections, etc.)
 */
export function createConnectedTool<
	TSchema extends z.ZodType<ConnectedToolInput & Record<string, unknown>>,
>(
	connection: BrowserConnection,
	name: string,
	description: string,
	inputSchema: TSchema,
	fn: (state: ConnectionState, input: z.infer<TSchema>, pageId: string) => Promise<CallToolResult>,
	outputSchema?: z.ZodObject<z.ZodRawShape>,
): ToolDefinition<TSchema> {
	return {
		name,
		description,
		inputSchema,
		outputSchema,
		async execute(args: z.infer<TSchema>, _context: ToolContext) {
			try {
				const state = connection.getConnection();
				const pageId = args.pageId ?? state.activePageId;

				return await fn(state, args, pageId);
			} catch (error) {
				if (error instanceof McpBrowserError) {
					return formatErrorResponse(error);
				}
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
	};
}
