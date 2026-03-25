import type { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { createLogger } from '../logger';
import type { CallToolResult, ConnectionState, ToolContext, ToolDefinition } from '../types';
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
					await enrichResponse(result, state, state.activePageId, options ?? {}, tabsBefore);
				}
				return result;
			} catch (error) {
				return await buildErrorResponse(error, connection, args, options ?? {});
			}
		},
	};
}
