import { z } from 'zod';

import { McpBrowserError } from '../errors';
import type { SessionManager } from '../session-manager';
import type {
	AffectedResource,
	BrowserSession,
	ToolContext,
	ToolDefinition,
	CallToolResult,
} from '../types';
import { formatErrorResponse } from '../utils';

// ---------------------------------------------------------------------------
// Session tool input constraint — every session tool must have these fields
// ---------------------------------------------------------------------------

type SessionToolInput = { sessionId: string; pageId?: string };

// ---------------------------------------------------------------------------
// Common Zod field schemas reused across tools
// ---------------------------------------------------------------------------

export const sessionIdField = z.string().describe('Session ID from browser_open');
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
// Tool factory: session-scoped tool with automatic session/page resolution
// ---------------------------------------------------------------------------

/**
 * Create a tool that operates on an existing session.
 * Handles session lookup, TTL touch, page resolution, and error formatting.
 *
 * Accepts either:
 *  - a ZodRawShape (auto-wrapped in z.object)
 *  - a pre-built ZodType (for unions, intersections, etc.)
 */
export function createSessionTool<
	TSchema extends z.ZodType<SessionToolInput & Record<string, unknown>>,
>(
	sessionManager: SessionManager,
	name: string,
	description: string,
	inputSchema: TSchema,
	fn: (session: BrowserSession, input: z.infer<TSchema>, pageId: string) => Promise<CallToolResult>,
	outputSchema?: z.ZodObject<z.ZodRawShape>,
	toolGroupId?: string,
	getResourceFromArgs?: (args: z.infer<TSchema>) => string,
): ToolDefinition<TSchema> {
	return {
		name,
		description,
		inputSchema,
		outputSchema,
		async execute(args: z.infer<TSchema>, _context: ToolContext) {
			try {
				const { sessionId, pageId: rawPageId } = args;
				const session = sessionManager.get(sessionId);
				sessionManager.touch(sessionId);

				const pageId = rawPageId ?? session.activePageId;

				return await fn(session, args, pageId);
			} catch (error) {
				if (error instanceof McpBrowserError) {
					return formatErrorResponse(error);
				}
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
		getAffectedResources(args: z.infer<TSchema>, _context: ToolContext): AffectedResource[] {
			const group = toolGroupId ?? 'browser';
			const resource = getResourceFromArgs
				? getResourceFromArgs(args)
				: getSessionResource(sessionManager, args.sessionId);
			return [{ toolGroup: group, resource, description: `Browser: ${resource}` }];
		},
	};
}

function getSessionResource(sessionManager: SessionManager, sessionId: string): string {
	try {
		const session = sessionManager.get(sessionId);
		const activeUrl = session.pages.get(session.activePageId)?.url;
		return activeUrl ? extractDomain(activeUrl) : 'browser';
	} catch {
		// Session doesn't exist yet or other error — use generic resource
		return 'browser';
	}
}

export function extractDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}
