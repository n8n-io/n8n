import type { BrowserConnection } from '../connection';
import { McpBrowserError } from '../errors';
import { createLogger } from '../logger';
import type { CallToolResult, ConnectionState, ModalState } from '../types';
import type { ConnectedToolOptions } from './helpers';

const log = createLogger('response-envelope');

// ---------------------------------------------------------------------------
// Page context resolution
// ---------------------------------------------------------------------------

/** Resolve the connection state and target page ID from tool args. */
export function resolvePageContext(
	connection: BrowserConnection,
	args: { pageId?: string },
): { state: ConnectionState; pageId: string } {
	const state = connection.getConnection();
	const pageId = args.pageId ?? state.activePageId;
	return { state, pageId };
}

// ---------------------------------------------------------------------------
// Response enrichment (success path)
// ---------------------------------------------------------------------------

/**
 * Inject snapshot, modal state, console summary, and new-tab diff into a
 * structured response. All injections are best-effort — failures are silently
 * ignored so the primary tool result is never lost.
 */
export async function enrichResponse(
	result: CallToolResult,
	state: ConnectionState,
	pageId: string,
	options: ConnectedToolOptions,
	tabsBefore?: Set<string>,
): Promise<void> {
	const data = result.structuredContent;
	if (!data || typeof data !== 'object') return;
	const record = data as Record<string, unknown>;

	if (options.autoSnapshot) {
		try {
			const snap = await state.adapter.snapshot(pageId);
			record.snapshot = snap.tree;
		} catch {
			// Snapshot failure shouldn't break the tool response
		}
	}

	try {
		const modals: ModalState[] = state.adapter.getModalStates(pageId);
		if (modals.length > 0) record.modalStates = modals;
	} catch {
		// Modal state check failure shouldn't break the response
	}

	if (options.autoSnapshot) {
		try {
			const summary = state.adapter.getConsoleSummary(pageId);
			if (summary.errors > 0 || summary.warnings > 0) record.consoleSummary = summary;
		} catch {
			// Console summary failure shouldn't break the response
		}
	}

	// Detect tabs opened as a result of this action
	if (tabsBefore) {
		try {
			const tabsNow = await state.adapter.listTabs();
			log.debug(`tab diff: before=${tabsBefore.size}, now=${tabsNow.length}`);
			const newTabs = tabsNow
				.filter((t) => !tabsBefore.has(t.id))
				.map((t) => ({ id: t.id, title: t.title, url: t.url }));
			if (newTabs.length > 0) {
				log.debug(
					`detected ${newTabs.length} new tab(s): ${JSON.stringify(newTabs.map((t) => t.url))}`,
				);
				record.newTabs = newTabs;
			}
		} catch {
			// Tab diff failure shouldn't break the response
		}
	}
}

// ---------------------------------------------------------------------------
// Error response builder (error path)
// ---------------------------------------------------------------------------

/**
 * Build a structured MCP error response, with best-effort snapshot and
 * modal state enrichment so the LLM retains page context even on failure.
 */
export async function buildErrorResponse(
	error: unknown,
	connection: BrowserConnection,
	args: { pageId?: string },
	options: ConnectedToolOptions,
): Promise<CallToolResult> {
	const mcpError =
		error instanceof McpBrowserError
			? error
			: new McpBrowserError(error instanceof Error ? error.message : String(error));

	const errorData: Record<string, unknown> = { error: mcpError.message };
	if (mcpError.hint) errorData.hint = mcpError.hint;

	// Best-effort enrichment — connection itself may be broken
	try {
		const { state, pageId } = resolvePageContext(connection, args);

		if (options.autoSnapshot) {
			try {
				const snap = await state.adapter.snapshot(pageId);
				errorData.snapshot = snap.tree;
			} catch {
				// Snapshot failure on error path is expected
			}
		}

		try {
			const modals = state.adapter.getModalStates(pageId);
			if (modals.length > 0) errorData.modalStates = modals;
		} catch {
			// Modal check failure on error path is expected
		}
	} catch {
		// Connection lookup failure — nothing more we can enrich
	}

	return {
		content: [{ type: 'text' as const, text: JSON.stringify(errorData, null, 2) }],
		structuredContent: errorData,
		isError: true,
	};
}
