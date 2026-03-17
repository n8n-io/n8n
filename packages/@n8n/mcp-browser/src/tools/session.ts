import { z } from 'zod';

import { McpBrowserError } from '../errors';
import type { SessionManager } from '../session-manager';
import type { ToolContext, ToolDefinition } from '../types';
import { browserNameSchema, sessionModeSchema, viewportSchema } from '../types';
import { formatErrorResponse, formatCallToolResult } from '../utils';
import { sessionIdField } from './helpers';

export function createSessionTools(sessionManager: SessionManager): ToolDefinition[] {
	return [browserOpen(sessionManager), browserClose(sessionManager)];
}

// ---------------------------------------------------------------------------
// browser_open
// ---------------------------------------------------------------------------

const browserOpenSchema = z.object({
	mode: sessionModeSchema
		.optional()
		.describe(
			'Session mode: "ephemeral" (default, recommended — fresh temporary browser, no setup required), ' +
				'"persistent" (named profile that survives across sessions), ' +
				'"local" (connect to user\'s real Chrome via n8n Browser Bridge extension — ' +
				'REQUIRES extension installed in Chrome first, only works with browser: "chrome")',
		),
	browser: browserNameSchema
		.optional()
		.describe(
			'Browser to use: chromium, chrome, brave, edge, firefox, safari, webkit. ' +
				'For local mode, only "chrome" is supported (requires n8n Browser Bridge extension).',
		),
	headless: z.boolean().optional().describe('Run in headless mode'),
	viewport: viewportSchema.optional().describe('Viewport size { width, height }'),
	profileName: z
		.string()
		.optional()
		.describe('Profile name for persistent mode (default: "default")'),
	ttlMs: z.number().positive().optional().describe('Session idle timeout in milliseconds'),
});

const browserOpenOutputSchema = z.object({
	sessionId: z.string(),
	browser: z.string(),
	mode: z.string(),
	pages: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			url: z.string(),
		}),
	),
});

function browserOpen(sessionManager: SessionManager): ToolDefinition<typeof browserOpenSchema> {
	return {
		name: 'browser_open',
		description:
			'Create a new browser session. Returns a sessionId for use in all other browser tools.\n\n' +
			'Modes:\n' +
			'- ephemeral (default): Fresh temporary browser, no setup required. Best for most tasks.\n' +
			'- persistent: Named profile that persists across sessions. Good for maintaining login state.\n' +
			"- local: Connect to user's real Chrome browser. REQUIRES the n8n Browser Bridge extension " +
			'to be installed in Chrome first. Only works with browser="chrome". ' +
			'If the extension is not installed, recommend ephemeral mode instead.',
		inputSchema: browserOpenSchema,
		outputSchema: browserOpenOutputSchema,
		async execute(args, _context: ToolContext) {
			try {
				const result = await sessionManager.open(args);
				return formatCallToolResult({
					sessionId: result.sessionId,
					browser: result.browser,
					mode: result.mode,
					pages: result.pages,
				});
			} catch (error) {
				if (error instanceof McpBrowserError) return formatErrorResponse(error);
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
	};
}

// ---------------------------------------------------------------------------
// browser_close
// ---------------------------------------------------------------------------

const browserCloseSchema = z.object({
	sessionId: sessionIdField,
});

const browserCloseOutputSchema = z.object({
	closed: z.boolean(),
	sessionId: z.string(),
});

function browserClose(sessionManager: SessionManager): ToolDefinition<typeof browserCloseSchema> {
	return {
		name: 'browser_close',
		description: 'Close a browser session and release all resources.',
		inputSchema: browserCloseSchema,
		outputSchema: browserCloseOutputSchema,
		async execute(args, _context: ToolContext) {
			try {
				await sessionManager.close(args.sessionId);
				return formatCallToolResult({ closed: true, sessionId: args.sessionId });
			} catch (error) {
				if (error instanceof McpBrowserError) return formatErrorResponse(error);
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
	};
}
