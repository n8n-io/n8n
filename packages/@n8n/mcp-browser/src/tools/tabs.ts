import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, extractDomain, withSnapshotEnvelope } from './helpers';

export function createTabTools(connection: BrowserConnection): ToolDefinition[] {
	return [tabOpen(connection), tabList(connection), tabFocus(connection), tabClose(connection)];
}

const tabOpenSchema = z.object({
	url: z.string().optional().describe('URL to navigate to (default: about:blank)'),
});

const tabOpenOutputSchema = withSnapshotEnvelope({
	pageId: z.string(),
	title: z.string(),
	url: z.string(),
});

function tabOpen(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_tab_open',
		'Open a new tab. Optionally navigate to a URL.',
		tabOpenSchema,
		async (state, input) => {
			const pageInfo = await state.adapter.newPage(input.url);
			state.pages.set(pageInfo.id, pageInfo);
			state.activePageId = pageInfo.id;
			return formatCallToolResult({
				pageId: pageInfo.id,
				title: pageInfo.title,
				url: pageInfo.url,
			});
		},
		tabOpenOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
		(args) => (args.url ? extractDomain(args.url) : 'browser'),
	);
}

const tabListSchema = z.object({});

const tabListOutputSchema = z.object({
	pages: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			url: z.string(),
			active: z.boolean(),
		}),
	),
});

function tabList(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_tab_list',
		'List all browser tabs currently controlled.',
		tabListSchema,
		async (state) => {
			// Two-tier model: listTabs() returns metadata from the relay (all tabs,
			// including those without Playwright page objects yet).
			const pages = await state.adapter.listTabs();
			return formatCallToolResult({
				pages: pages.map((p) => ({
					...p,
					active: p.id === state.activePageId,
				})),
			});
		},
		tabListOutputSchema,
	);
}

const tabFocusSchema = z.object({
	pageId: z.string().describe('Page ID to make active'),
});

const tabFocusOutputSchema = z.object({
	activePageId: z.string(),
});

function tabFocus(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_tab_focus',
		'Switch the active tab. Note: focusing is not required to interact with a tab — you can interact with any tab regardless of focus.',
		tabFocusSchema,
		async (state, input) => {
			// Verify page exists — use listTabs() to include relay-known tabs
			// that may not have Playwright page objects yet
			const pages = await state.adapter.listTabs();
			const target = pages.find((p) => p.id === input.pageId);
			if (!target) {
				const { PageNotFoundError } = await import('../errors');
				throw new PageNotFoundError(input.pageId);
			}
			await state.adapter.focusPage(input.pageId);
			state.activePageId = input.pageId;
			return formatCallToolResult({ activePageId: input.pageId });
		},
		tabFocusOutputSchema,
	);
}

const tabCloseSchema = z.object({
	pageId: z.string().describe('Page ID to close'),
});

const tabCloseOutputSchema = z.object({
	closed: z.boolean(),
	pageId: z.string(),
});

function tabClose(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_tab_close',
		'Close a tab.',
		tabCloseSchema,
		async (state, input) => {
			await state.adapter.closePage(input.pageId);
			state.pages.delete(input.pageId);

			// Switch active page if we just closed the active one
			if (state.activePageId === input.pageId) {
				const remainingTabs = await state.adapter.listTabs();
				state.activePageId =
					remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : '';
			}

			return formatCallToolResult({ closed: true, pageId: input.pageId });
		},
		tabCloseOutputSchema,
		{ skipEnrichment: true },
	);
}
