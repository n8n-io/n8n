import type { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { ConnectionLostError } from '../errors';
import { createLogger } from '../logger';
import type {
	AffectedResource,
	CallToolResult,
	ConnectionState,
	ToolContext,
	ToolDefinition,
} from '../types';
import { buildErrorResponse, enrichResponse, resolvePageContext } from './response-envelope';

const log = createLogger('connected-tool');

// ---------------------------------------------------------------------------
// Re-export schemas so existing tool files can keep importing from helpers
// ---------------------------------------------------------------------------

export {
	consoleSummarySchema,
	elementTargetSchema,
	modalStateSchema,
	pageIdField,
	withSnapshotEnvelope,
} from './schemas';
export type { ElementTargetInput } from './schemas';

// ---------------------------------------------------------------------------
// Connected tool input constraint — every tool must have at least pageId
// ---------------------------------------------------------------------------

type ConnectedToolInput = { pageId?: string };

// ---------------------------------------------------------------------------
// Connected tool options
// ---------------------------------------------------------------------------

export interface ConnectedToolOptions {
	/** Append an accessibility snapshot to the response after the action. */
	autoSnapshot?: boolean;
	/** Wrap the action in waitForCompletion (network/navigation settle). */
	waitForCompletion?: boolean;
	/** Skip post-action enrichment (snapshot, tab diff, etc.). Use for destructive actions like tab close. */
	skipEnrichment?: boolean;
}

// ---------------------------------------------------------------------------
// Domain extraction helper
// ---------------------------------------------------------------------------

export function extractDomain(url: string): string {
	try {
		return new URL(url).hostname || 'browser';
	} catch {
		return 'browser';
	}
}

// ---------------------------------------------------------------------------
// Tool factory: connection-scoped tool with automatic page resolution
// ---------------------------------------------------------------------------

/**
 * Create a tool that operates on the active browser connection.
 * Handles connection lookup, page resolution, error formatting,
 * and optional post-action response enrichment (snapshot, modals, console).
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
	options?: ConnectedToolOptions,
	getResourceFromArgs?: (args: z.infer<TSchema>) => string,
): ToolDefinition<TSchema> {
	return {
		name,
		description,
		inputSchema,
		outputSchema,
		async execute(args: z.infer<TSchema>, _context: ToolContext) {
			try {
				const { state, pageId } = resolvePageContext(connection, args);

				// Snapshot tab IDs before the action so we can detect new tabs
				let tabsBefore: Set<string> | undefined;
				if (!options?.skipEnrichment) {
					tabsBefore = new Set(await state.adapter.listTabIds());
					log.debug(`tabsBefore snapshot: ${tabsBefore.size} tab(s)`);
				}

				const result = options?.waitForCompletion
					? await state.adapter.waitForCompletion(pageId, async () => await fn(state, args, pageId))
					: await fn(state, args, pageId);

				if (!options?.skipEnrichment) {
					// Re-resolve: tab-creating actions (tab_open) update activePageId
					const enrichPageId = state.activePageId || pageId;
					await enrichResponse(result, state, enrichPageId, options ?? {}, tabsBefore);
				}
				// Sync live URL back to state.pages so the cache stays fresh
				const currentUrl = state.adapter.getPageUrl(pageId);
				if (currentUrl) {
					const pageInfo = state.pages.get(pageId);
					if (pageInfo) pageInfo.url = currentUrl;
				}

				return result;
			} catch (error) {
				// Playwright throws TargetClosedError when browser/page dies mid-operation.
				// Re-throw as our typed error so the AI gets a clear message + hint.
				if (error instanceof Error && error.name === 'TargetClosedError') {
					return await buildErrorResponse(
						new ConnectionLostError('browser_closed'),
						connection,
						args,
						options ?? {},
					);
				}
				return await buildErrorResponse(error, connection, args, options ?? {});
			}
		},
		getAffectedResources(args: z.infer<TSchema>, _context: ToolContext): AffectedResource[] {
			const resource = getResourceFromArgs
				? getResourceFromArgs(args)
				: getConnectionResource(connection);
			return [{ toolGroup: 'browser', resource, description: `Browser: ${resource}` }];
		},
	};
}

function getConnectionResource(connection: BrowserConnection): string {
	try {
		const state = connection.getConnection();
		// Get live URL from Playwright (not the stale pages map)
		const liveUrl = state.adapter.getPageUrl(state.activePageId);
		if (liveUrl) return extractDomain(liveUrl);
		// Fallback to cached pages map
		const activePage = state.pages.get(state.activePageId);
		return activePage?.url ? extractDomain(activePage.url) : 'browser';
	} catch {
		// Not connected or other error — use generic resource
		return 'browser';
	}
}
