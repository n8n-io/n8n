import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { createSessionTool, sessionIdField } from './helpers';

export function createTabTools(sessionManager: SessionManager): ToolDefinition[] {
	return [
		tabOpen(sessionManager),
		tabList(sessionManager),
		tabFocus(sessionManager),
		tabClose(sessionManager),
	];
}

function tabOpen(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_open',
		'Open a new tab in an existing session. Optionally navigate to a URL.',
		{
			sessionId: sessionIdField,
			url: z.string().optional().describe('URL to navigate to (default: about:blank)'),
		},
		async (session, input) => {
			const pageInfo = await session.adapter.newPage(input.url);
			session.pages.set(pageInfo.id, pageInfo);
			session.activePageId = pageInfo.id;
			return { pageId: pageInfo.id, title: pageInfo.title, url: pageInfo.url };
		},
	);
}

function tabList(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_list',
		'List all open tabs in a session.',
		{
			sessionId: sessionIdField,
		},
		async (session) => {
			const pages = await session.adapter.listPages();
			return {
				pages: pages.map((p) => ({
					...p,
					active: p.id === session.activePageId,
				})),
			};
		},
	);
}

function tabFocus(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_focus',
		'Switch the active tab in a session.',
		{
			sessionId: sessionIdField,
			pageId: z.string().describe('Page ID to make active'),
		},
		async (session, input) => {
			// Verify page exists by listing
			const pages = await session.adapter.listPages();
			const target = pages.find((p) => p.id === input.pageId);
			if (!target) {
				const { PageNotFoundError } = await import('../errors');
				throw new PageNotFoundError(input.pageId, session.id);
			}
			session.activePageId = input.pageId;
			return { activePageId: input.pageId };
		},
	);
}

function tabClose(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_close',
		'Close a tab. If it is the last tab, the session is also closed.',
		{
			sessionId: sessionIdField,
			pageId: z.string().describe('Page ID to close'),
		},
		async (session, input) => {
			await session.adapter.closePage(input.pageId);
			session.pages.delete(input.pageId);

			const remainingPages = await session.adapter.listPages();
			let sessionClosed = false;

			if (remainingPages.length === 0) {
				await sessionManager.close(session.id);
				sessionClosed = true;
			} else if (session.activePageId === input.pageId) {
				// Switch to most recently available page
				session.activePageId = remainingPages[remainingPages.length - 1].id;
			}

			return { closed: true, pageId: input.pageId, sessionClosed };
		},
	);
}
