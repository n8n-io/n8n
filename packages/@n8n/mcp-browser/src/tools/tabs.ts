import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool } from './helpers';

export function createTabTools(connection: BrowserConnection): ToolDefinition[] {
	return [tabOpen(connection), tabList(connection), tabFocus(connection), tabClose(connection)];
}

const tabOpenSchema = z.object({
	url: z.string().optional().describe('URL to navigate to (default: about:blank)'),
});

const tabOpenOutputSchema = z.object({
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
			const pages = await state.adapter.listPages();
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
		'Switch the active tab.',
		tabFocusSchema,
		async (state, input) => {
			// Verify page exists by listing
			const pages = await state.adapter.listPages();
			const target = pages.find((p) => p.id === input.pageId);
			if (!target) {
				const { PageNotFoundError } = await import('../errors');
				throw new PageNotFoundError(input.pageId);
			}
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
	disconnected: z.boolean(),
});

function tabClose(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_tab_close',
		'Close a tab. If it is the last tab, the browser is also disconnected.',
		tabCloseSchema,
		async (state, input) => {
			await state.adapter.closePage(input.pageId);
			state.pages.delete(input.pageId);

			const remainingPages = await state.adapter.listPages();
			let disconnected = false;

			if (remainingPages.length === 0) {
				await connection.disconnect();
				disconnected = true;
			} else if (state.activePageId === input.pageId) {
				// Switch to most recently available page
				state.activePageId = remainingPages[remainingPages.length - 1].id;
			}

			return formatCallToolResult({ closed: true, pageId: input.pageId, disconnected });
		},
		tabCloseOutputSchema,
	);
}
